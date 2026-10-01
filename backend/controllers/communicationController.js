import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  handleMessageStatusWebhook,
  handleVoiceStatusWebhook,
  listCommunicationHistory,
  processComplaintCommunication,
} from "../services/communicationService.js";
import { getComplaintOrThrow } from "../services/complaintService.js";

export const voiceStatusWebhookHandler = asyncHandler(async (request, response) => {
  const log = await handleVoiceStatusWebhook({ request, io: request.app.get("io") });
  sendSuccess(response, { id: log._id, status: log.status });
});

export const messageStatusWebhookHandler = asyncHandler(async (request, response) => {
  const log = await handleMessageStatusWebhook({ request, io: request.app.get("io") });
  sendSuccess(response, { id: log._id, status: log.status });
});

export const listTicketCommunicationsHandler = asyncHandler(async (request, response) => {
  sendSuccess(response, await listCommunicationHistory(request.params.ticketId));
});

export const retryTicketCommunicationsHandler = asyncHandler(async (request, response) => {
  const complaint = await getComplaintOrThrow(request.params.ticketId);
  const result = await processComplaintCommunication(complaint, { io: request.app.get("io") });
  sendSuccess(response, result, "Communication workflow retried");
});
