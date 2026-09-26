import os
import glob
import math
from ai.config import embeddings

class InMemoryVectorStore:
    """
    A lightweight, pure-Python in-memory Vector Store designed to avoid heavy pre-compiled 
    C-extensions (like FAISS/Chroma compiling issues on Windows) while maintaining full 
    functional compatibility with standard embedding flows.
    """
    def __init__(self):
        self.documents = []  # List of {"text": str, "vector": list[float], "metadata": dict}

    def add_texts(self, texts: list[str], metadatas: list[dict] = None):
        if not texts:
            return
        try:
            batch_size = 8
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                batch_meta = metadatas[i:i + batch_size] if metadatas else None
                vectors = embeddings.embed_documents(batch_texts)
                for j, text in enumerate(batch_texts):
                    meta = batch_meta[j] if batch_meta else {}
                    self.documents.append({
                        "text": text,
                        "vector": vectors[j],
                        "metadata": meta
                    })
        except Exception as e:
            print(f"[RAG ENGINE ERROR] Failed to embed texts: {e}")

    def similarity_search(self, query: str, k: int = 2) -> list[dict]:
        if not self.documents:
            return []
        try:
            query_vec = embeddings.embed_query(query)
            
            results = []
            for doc in self.documents:
                doc_vec = doc["vector"]
                
                # Compute Cosine Similarity in pure Python
                dot_product = sum(q * d for q, d in zip(query_vec, doc_vec))
                norm_q = math.sqrt(sum(q * q for q in query_vec))
                norm_d = math.sqrt(sum(d * d for d in doc_vec))
                
                similarity = dot_product / (norm_q * norm_d) if (norm_q * norm_d) > 0 else 0
                results.append((doc, similarity))
                
            # Sort by similarity descending
            results.sort(key=lambda x: x[1], reverse=True)
            return [item[0] for item in results[:k]]
        except Exception as e:
            print(f"[RAG ENGINE ERROR] Similarity search failed: {e}")
            return []

# Initialize Global Vector Store Instance
vector_store = InMemoryVectorStore()

def chunk_markdown_file(file_path: str) -> list[dict]:
    """
    Reads a markdown file and splits it into logical chunks (e.g. by sub-headers).
    """
    chunks = []
    filename = os.path.basename(file_path)
    if not os.path.exists(file_path):
        return chunks
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Split by markdown headers
    sections = content.split("\n## ")
    title = sections[0].replace("# ", "").strip()
    
    # First block is general overview
    chunks.append({
        "text": f"SOP Title: {title}\n{sections[0].strip()}",
        "metadata": {"source": filename, "section": "Overview"}
    })
    
    for sec in sections[1:]:
        lines = sec.split("\n")
        section_name = lines[0].strip()
        body = "\n".join(lines[1:]).strip()
        chunks.append({
            "text": f"SOP Title: {title}\nSection: {section_name}\n{body}",
            "metadata": {"source": filename, "section": section_name}
        })
        
    return chunks

def seed_rag_knowledge_base():
    """
    Finds all SOP files in the knowledge_base folder, chunks them, embeds them,
    and populates the global vector store.
    """
    kb_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "knowledge_base")
    sop_files = glob.glob(os.path.join(kb_path, "*.md"))
    
    print(f"[RAG ENGINE] Found {len(sop_files)} SOP files to index in '{kb_path}'")
    
    all_texts = []
    all_metadatas = []
    
    for file_path in sop_files:
        chunks = chunk_markdown_file(file_path)
        for chunk in chunks:
            all_texts.append(chunk["text"])
            all_metadatas.append(chunk["metadata"])
            
    if all_texts:
        vector_store.add_texts(all_texts, all_metadatas)
        print(f"[RAG ENGINE] Successfully loaded & indexed {len(all_texts)} sections into memory vector store.")
    else:
        print("[RAG ENGINE WARNING] No documents found to seed.")

def retrieve_sop_for_complaint(category: str) -> str:
    """
    RAG Tool function. Performs a semantic search for the category and constructs
    a highly coherent, unified safety/disposal guide.
    """
    # Seed the DB if it hasn't been seeded yet
    if not vector_store.documents:
        seed_rag_knowledge_base()
        
    query = f"Safety and disposal guidelines for handling {category} waste"
    matches = vector_store.similarity_search(query, k=2)
    
    if not matches:
        return "No standard operating procedures found in vector database. Handle with standard dry/wet waste precautions."
        
    sop_text = f"=== Municipal SOP & Safety Guidelines for {category} Waste ===\n\n"
    for i, match in enumerate(matches):
        sop_text += f"[Ref: {match['metadata']['source']} - {match['metadata']['section']}]\n"
        sop_text += f"{match['text']}\n\n"
        
    return sop_text.strip()
