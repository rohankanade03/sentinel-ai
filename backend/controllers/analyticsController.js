import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { analyticsRepository } from "../repositories/analyticsRepository.js";
import { getLocalAnalytics, isLocalDatabaseMode } from "../services/localDevStore.js";

export const getAnalytics = asyncHandler(async (request, response) => {
  if (isLocalDatabaseMode(request)) {
    sendSuccess(response, getLocalAnalytics());
    return;
  }

  const [byStatus, byCategory, byWard, monthly, bySlaStatus] =
    await analyticsRepository.getComplaintBreakdowns();

  sendSuccess(response, {
    byStatus,
    byCategory,
    byWard,
    monthly,
    bySlaStatus,
    generatedAt: new Date().toISOString(),
  });
});
