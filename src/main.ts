import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // set the timezone
    process.env.TZ = "Asia/Tehran";

    await app.listen(process.env.PORT);
}
bootstrap();
