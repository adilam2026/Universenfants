import { Global, Module } from "@nestjs/common";
import { MeiliSearch } from "meilisearch";
import { SearchService } from "./search.service";
import { MEILISEARCH_CLIENT } from "./search.constants";

@Global()
@Module({
  providers: [
    {
      provide: MEILISEARCH_CLIENT,
      useFactory: () =>
        new MeiliSearch({
          host: process.env.MEILISEARCH_HOST ?? "http://localhost:7700",
          apiKey: process.env.MEILISEARCH_API_KEY,
        }),
    },
    SearchService,
  ],
  exports: [MEILISEARCH_CLIENT, SearchService],
})
export class SearchModule {}
