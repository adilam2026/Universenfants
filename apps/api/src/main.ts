import "reflect-metadata";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: false });

  // Repli local pour les images produit quand R2 n'est pas configuré (voir StorageModule).
  // __dirname (pas process.cwd()) pour rester correct quel que soit le répertoire de lancement.
  app.useStaticAssets(process.env.UPLOADS_DIR ?? join(__dirname, "..", "uploads"), { prefix: "/uploads/" });

  const corsOrigins = (process.env.CORS_ORIGINS ?? "").split(",").filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  });

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle("UniversEnfants API")
    .setDescription("API unique consommée par la boutique (apps/web) et le back-office (apps/admin).")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API ready on http://localhost:${port}/api — docs at /api/docs`);
}

bootstrap();
