export interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Complaint {
  _id?: string;
  status: string;
  upvotes: number;
  photo_url: string;
  location: GeoJSONPoint;
  timestamp: Date;
  ward?: string;
  constituency?: string;
  mla?: string;
  reporter_hash: string;
  points_awarded: boolean;
  worker_id?: string;
  worker_status?: string;
  after_photo_url?: string;
  cleared_timestamp?: Date;
}

export interface Worker {
  _id?: string;
  name: string;
  worker_id: string;
  ward: string;
  status: string;
  current_location?: GeoJSONPoint;
  tasks_completed: number;
  total_time_taken: number;
  rating: number;
}

export interface ChatMessage {
  _id?: string;
  complaint_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "Admin" | "Worker";
  message: string;
  timestamp: Date;
}
