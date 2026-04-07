import * as authSchema from "./auth-schema";
import * as profileSchema from "./profile-schema";

export const databaseSchema = {
  ...authSchema,
  ...profileSchema,
};

export * from "./auth-schema";
export * from "./profile-schema";
