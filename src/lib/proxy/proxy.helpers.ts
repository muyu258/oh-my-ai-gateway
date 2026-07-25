const decodedResponseHeaders = ["content-encoding", "content-length", "transfer-encoding"];

export const forwardResponse = (response: Response): Response => {
  const { headers, status, statusText } = response;
  const newHeaders = new Headers(headers);

  for (const header of decodedResponseHeaders) newHeaders.delete(header);

  return new Response(response.body, {
    status,
    statusText,
    headers: newHeaders,
  });
};
