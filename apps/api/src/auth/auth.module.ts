import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ScheduleModule } from "@nestjs/schedule";
import { CustomerAuthController } from "./customer-auth.controller";
import { CustomerAuthService } from "./customer-auth.service";
import { StaffAuthController } from "./staff-auth.controller";
import { StaffAuthService } from "./staff-auth.service";
import { RefreshTokenCleanupService } from "./refresh-token-cleanup.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { PermissionsGuard } from "./guards/permissions.guard";

@Module({
  imports: [PassportModule, JwtModule.register({}), ScheduleModule.forRoot()],
  controllers: [CustomerAuthController, StaffAuthController],
  providers: [CustomerAuthService, StaffAuthService, JwtStrategy, PermissionsGuard, RefreshTokenCleanupService],
  exports: [PermissionsGuard],
})
export class AuthModule {}
