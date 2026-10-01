import { complaintRepository } from "./complaintRepository.js";

export const analyticsRepository = {
  getComplaintBreakdowns() {
    return Promise.all([
      complaintRepository.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      complaintRepository.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      complaintRepository.aggregate([
        { $group: { _id: "$location.ward", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      complaintRepository.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      complaintRepository.aggregate([
        {
          $group: {
            _id: "$sla.status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);
  },
};
