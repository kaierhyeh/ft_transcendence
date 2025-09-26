// TypeScript type definitions related to the 'chat' domain
// It keeps the type declarations separate from business logic, models, or services — making the codebase cleaner.

// example :

// export interface CreateChatDTO {
//   name: string;
// }

// export interface ChatResponse {
//   id: number;
//   name: string;
//   createdAt: string;
// }

export type Message = {
	id:			number;
	from_id:	number;
	to_id:		number;
	msg:		string;
};
