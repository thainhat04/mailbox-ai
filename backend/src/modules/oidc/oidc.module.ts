// oidc.module.ts
import { Module, DynamicModule } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { OIDCService } from "./oidc.service";
import { EmailModule } from "../email/email.module";

@Module({})
export class OIDCModule {
  static register(providers: any[]): DynamicModule {
    return {
      module: OIDCModule,
      imports: [PassportModule.register({ session: true }), EmailModule],
      providers: [
        OIDCService,
        ...providers, // inject all strategy providers here
      ],
      exports: [OIDCService],
    };
  }
}
