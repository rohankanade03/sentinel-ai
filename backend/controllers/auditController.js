import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { listAuditLogs } from "../services/auditLogService.js";
import { getLocalAuditLog, isLocalDatabaseMode } from "../services/localDevStore.js";

export const getAuditLog = asyncHandler(async (request, response) => {
  if (isLocalDatabaseMode(request)) {
    sendSuccess(response, getLocalAuditLog());
    return;
  }

  sendSuccess(response, await listAuditLogs());
});
