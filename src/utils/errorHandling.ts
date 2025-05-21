/**
 * Standardized error handling for tool execution
 */
export function handleToolError(error: any, toolName: string, params: any) {
  console.error(`Error in ${toolName}:`, error);

  // Create a detailed error message
  let errorDetails = "Error details: ";

  if (error.response) {
    // The server responded with an error status
    errorDetails += `Status: ${error.response.status}, `;

    if (error.response.data) {
      // Include the response data which often contains the error message
      errorDetails += `Message: ${JSON.stringify(error.response.data)}`;
    } else {
      errorDetails += `Message: ${error.message}`;
    }
  } else if (error.request) {
    // Request was made but no response received
    errorDetails += `No response received: ${error.message}`;
  } else {
    // Something else caused the error
    errorDetails += `${error.message}`;
  }

  return {
    content: [
      {
        type: "text" as const,
        text: `Failed to execute ${toolName} with parameters ${JSON.stringify(params)}. ${errorDetails}`,
      },
    ],
    isError: true,
  };
}