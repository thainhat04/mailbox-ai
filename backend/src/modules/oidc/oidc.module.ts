// oidc.module.ts
import { Module, DynamicModule } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { OIDCService } from "./oidc.service";

@Module({})
export class OIDCModule {
  static register(providers: any[]): DynamicModule {
    return {
      module: OIDCModule,
      imports: [PassportModule.register({ session: true })],
      providers: [
        OIDCService,
        ...providers, // inject all strategy providers here
      ],
      exports: [OIDCService],
    };
  }
}
