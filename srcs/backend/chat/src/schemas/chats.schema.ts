// // the validation schema (JSON Schema)
// // Fastify uses JSON Schema for request/response validation, ensuring input/output matches what we expect

// export const getChatSchema = {
// 	description: "Get chat partners for a given user",
// 	tags: ["chats"],
// 	params: {
// 		type: "object",
// 		required: ["userId"],
// 		properties: {
// 			userId: { type: "number", minimum: 1 },
// 		},
// 	},
// 	response: {
// 		200: {
// 			type: "array",
// 			items: {
// 				type: "object",
// 				properties: {
// 					id: { type: "number" },
// 					username: { type: "string" },
// 				},
// 			},
// 		},
// 		404: {
// 			type: "object",
// 			properties: {
// 				e: { type: "string" },
// 			},
// 		},
// 	},
// } as const;