// the validation schema (JSON Schema)
// Fastify uses JSON Schema for request/response validation, ensuring input/output matches what we expect

// example:

// export const createChatSchema = {
//   body: {
//     type: "object",
//     required: ["name"],
//     properties: {
//       name: { type: "string", minLength: 1 }
//     }
//   },
//   response: {
//     201: {
//       type: "object",
//       properties: {
//         id: { type: "number" },
//         name: { type: "string" },
//         createdAt: { type: "string" }
//       }
//     }
//   }
// };


export const getChatSchema = {
	params: {
		type: "object",
		required: ["userId"],
		properties: {
			userId: { type: "integer", minimum: 1 },
		},
	},
	response: {
		200: {
			type: "array",
			items: {
				type: "object",
				properties: {
					id: { type: "number" },
					username: { type: "string" },
				},
			},
		},
		400: {
			type: "object",
			properties: {
				error: { type: "string" },
			},
		},
	},
};
