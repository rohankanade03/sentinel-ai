export type WorkerAvailability = "AVAILABLE" | "BUSY" | "ON DUTY" | "OFFLINE";

export interface BhopalWorker {
  id: string;
  workerId: string;
  name: string;
  department: string;
  role: string;
  zone: string;
  status: WorkerAvailability;
  lat: number;
  lng: number;
}

export const bhopalWorkers: BhopalWorker[] = [
  { id: "w-101", workerId: "worker@101", name: "Ravi Gupta", department: "Electricity", role: "Electrician", zone: "MP Nagar", status: "AVAILABLE", lat: 23.2336, lng: 77.4343 },
  { id: "w-102", workerId: "worker@102", name: "Amit Verma", department: "Sanitation", role: "Sanitation Worker", zone: "Arera Colony", status: "BUSY", lat: 23.2108, lng: 77.4322 },
  { id: "w-103", workerId: "worker@103", name: "Suresh Yadav", department: "Road Maintenance", role: "Road Inspector", zone: "Kolar Road", status: "AVAILABLE", lat: 23.1668, lng: 77.4165 },
  { id: "w-104", workerId: "worker@104", name: "Rahul Sharma", department: "Water Supply", role: "Plumber", zone: "Bairagarh", status: "ON DUTY", lat: 23.2875, lng: 77.337 },
  { id: "w-105", workerId: "worker@105", name: "Deepak Mishra", department: "Garbage Collection", role: "Collection Supervisor", zone: "Shahpura", status: "AVAILABLE", lat: 23.2081, lng: 77.4578 },
  { id: "w-106", workerId: "worker@106", name: "Vikas Tiwari", department: "Electricity", role: "Line Technician", zone: "Govindpura", status: "BUSY", lat: 23.2587, lng: 77.4633 },
  { id: "w-107", workerId: "worker@107", name: "Ankit Jain", department: "Sanitation", role: "Cleaning Supervisor", zone: "Habibganj", status: "AVAILABLE", lat: 23.2292, lng: 77.4407 },
  { id: "w-108", workerId: "worker@108", name: "Manoj Patel", department: "Road Maintenance", role: "Pothole Repair Worker", zone: "TT Nagar", status: "ON DUTY", lat: 23.233, lng: 77.4018 },
  { id: "w-109", workerId: "worker@109", name: "Rakesh Singh", department: "Water Supply", role: "Pipeline Technician", zone: "Ayodhya Nagar", status: "AVAILABLE", lat: 23.2594, lng: 77.4855 },
  { id: "w-110", workerId: "worker@110", name: "Pankaj Dubey", department: "Garbage Collection", role: "Waste Collector", zone: "Lalghati", status: "BUSY", lat: 23.2739, lng: 77.3648 },
  { id: "w-111", workerId: "worker@111", name: "Nitin Chouhan", department: "Electricity", role: "Substation Operator", zone: "Chuna Bhatti", status: "AVAILABLE", lat: 23.1901, lng: 77.4045 },
  { id: "w-112", workerId: "worker@112", name: "Ashok Kushwaha", department: "Sanitation", role: "Drainage Cleaner", zone: "Kotra Sultanabad", status: "ON DUTY", lat: 23.2435, lng: 77.412 },
  { id: "w-113", workerId: "worker@113", name: "Sanjay Thakur", department: "Road Maintenance", role: "Road Engineer", zone: "New Market", status: "AVAILABLE", lat: 23.2349, lng: 77.3996 },
  { id: "w-114", workerId: "worker@114", name: "Ajay Saxena", department: "Water Supply", role: "Water Tank Operator", zone: "Bagh Mugalia", status: "BUSY", lat: 23.1815, lng: 77.4652 },
  { id: "w-115", workerId: "worker@115", name: "Gaurav Joshi", department: "Garbage Collection", role: "Garbage Truck Driver", zone: "Misrod", status: "AVAILABLE", lat: 23.1784, lng: 77.4363 },
  { id: "w-116", workerId: "worker@116", name: "Pradeep Nair", department: "Electricity", role: "Cable Technician", zone: "Kohefiza", status: "ON DUTY", lat: 23.2667, lng: 77.3869 },
  { id: "w-117", workerId: "worker@117", name: "Mukesh Solanki", department: "Sanitation", role: "Sweeper", zone: "Ashoka Garden", status: "AVAILABLE", lat: 23.259, lng: 77.4301 },
  { id: "w-118", workerId: "worker@118", name: "Harish Meena", department: "Road Maintenance", role: "Maintenance Supervisor", zone: "Piplani", status: "BUSY", lat: 23.2507, lng: 77.4698 },
  { id: "w-119", workerId: "worker@119", name: "Dinesh Rathore", department: "Water Supply", role: "Valve Operator", zone: "Karond", status: "AVAILABLE", lat: 23.3091, lng: 77.4126 },
  { id: "w-120", workerId: "worker@120", name: "Kamal Agrawal", department: "Garbage Collection", role: "Waste Segregation Officer", zone: "Char Imli", status: "ON DUTY", lat: 23.2154, lng: 77.4032 },
];

export function findWorkerById(workerId?: string) {
  return bhopalWorkers.find(
    (worker) => worker.workerId.toLowerCase() === String(workerId || "").toLowerCase(),
  );
}
