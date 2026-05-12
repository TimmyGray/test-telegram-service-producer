import appConfig from "config";
import { DynamicModule, Global, Module, } from "@nestjs/common";
import { IConfig } from "./config.interface";

@Global()
@Module({})
export class ConfigModule {
  public static forRoot(): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: IConfig,
          useValue: appConfig,
        },
      ],
      exports: [IConfig],
    }
  }

  public static forFeature<T>(type: abstract new () => T, key: string): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: type,
          useFactory: (config: IConfig) => {
            return config.get(key);
          },
          inject: [IConfig],
        }
      ],
      exports: [type],
    }
  }
}