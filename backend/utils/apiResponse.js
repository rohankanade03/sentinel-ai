export function sendSuccess(response, data, message = "OK", statusCode = 200) {
  return response.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

export function sendCreated(response, data, message = "Created") {
  return sendSuccess(response, data, message, 201);
}
