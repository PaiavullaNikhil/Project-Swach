export const MLA_MAPPING: Record<string, string> = {
  "ANEKAL": "B. Shivanna",
  "BANGALORE SOUTH": "M. Krishnappa",
  "BASAVANAGUDI": "L.A. Ravi Subramanya",
  "B.T.M. LAYOUT": "Ramalinga Reddy",
  "BOMMANAHALLI": "M. Satish Reddy",
  "BYATARAYANAPURA": "Krishna Byre Gowda",
  "C.V. RAMAN NAGAR": "S. Raghu",
  "CHAMARAJPET": "B.Z. Zameer Ahmed Khan",
  "CHICKPET": "Uday B. Garudachar",
  "DASARAHALLI": "S. Muniraju",
  "GANDHI NAGAR": "Dinesh Gundu Rao",
  "GOVINDRAJA NAGAR": "Priya Krishna",
  "HEBBAL": "Suresha B.S. (Byrathi)",
  "HOSKOTE": "Sharath Kumar Bachegowda",
  "JAYANAGAR": "C.K. Ramamurthy",
  "K.R.PURA": "B.A. Basavaraja",
  "MAHADEVAPURA": "Manjula S.",
  "MAHALAXMI LAYOUT": "K. Gopalaiah",
  "MALLESWARAM": "Dr. C.N. Ashwath Narayan",
  "PADMANABA NAGAR": "R. Ashoka",
  "PULAKESHI NAGAR": "A.C. Srinivasa",
  "RAJAJI NAGAR": "S. Suresh Kumar",
  "RAJARAJESHWARI NAGAR": "Munirathna",
  "SARVARGNA NAGAR": "K.J. George",
  "SHANTI NAGAR": "N.A. Haris",
  "SHIVAJI NAGAR": "Rizwan Arshad",
  "VIJAYA NAGAR": "H.R. Gaviyappa",
  "YELAHANKA": "S.R. Vishwanath",
  "YESHVANTHAPURA": "S.T. Somashekar",
};

export const getMLAName = (constituency: string): string => {
  if (!constituency) return "Unknown MLA";
  
  // Clean up constituency string: "150-YELAHANKA" -> "YELAHANKA", also remove "(SC)"
  const cleanConst = constituency
    .replace(/^\d+-/, '')
    .replace(/\(SC\)/i, '')
    .trim()
    .toUpperCase();
  
  // Try exact match on cleaned name
  if (MLA_MAPPING[cleanConst]) {
    return MLA_MAPPING[cleanConst];
  }

  // Fallback substring match
  for (const [key, value] of Object.entries(MLA_MAPPING)) {
    if (cleanConst.includes(key) || key.includes(cleanConst)) {
      return value;
    }
  }
  
  return "Unknown MLA";
};
