import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI(migrate, studio 등)는 pooler를 거치지 않는 direct 연결을 써야 해서 DIRECT_URL 사용
    url: env("DIRECT_URL"),
  },
});
