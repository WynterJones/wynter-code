import { describe, it, expect } from "vitest";
import { isSensitiveKey } from "./sensitiveKeyDetection";

describe("isSensitiveKey", () => {
  describe("API key patterns", () => {
    it("detects API_KEY", () => {
      expect(isSensitiveKey("API_KEY")).toBe(true);
    });

    it("detects api_key (lowercase)", () => {
      expect(isSensitiveKey("api_key")).toBe(true);
    });

    it("detects APIKEY without separator", () => {
      expect(isSensitiveKey("APIKEY")).toBe(true);
    });

    it("detects API-KEY with hyphen", () => {
      expect(isSensitiveKey("API-KEY")).toBe(true);
    });

    it("detects prefixed API keys", () => {
      expect(isSensitiveKey("MY_API_KEY")).toBe(true);
      expect(isSensitiveKey("SERVICE_APIKEY")).toBe(true);
      expect(isSensitiveKey("CUSTOM_API-KEY")).toBe(true);
    });

    it("does not match KEY without API prefix", () => {
      // The pattern requires api before key
      expect(isSensitiveKey("ENCRYPTION_KEY")).toBe(false);
      expect(isSensitiveKey("SIGNING_KEY")).toBe(false);
      expect(isSensitiveKey("MY_KEY")).toBe(false);
    });

    it("does not match API.KEY with dot separator", () => {
      // Pattern only allows _ or - as separator, not dot
      expect(isSensitiveKey("API.KEY")).toBe(false);
    });

    it("does not match API KEY with space separator", () => {
      // Pattern only allows _ or - as separator, not space
      expect(isSensitiveKey("API KEY")).toBe(false);
    });
  });

  describe("secret patterns", () => {
    it("detects SECRET", () => {
      expect(isSensitiveKey("SECRET")).toBe(true);
    });

    it("detects CLIENT_SECRET", () => {
      expect(isSensitiveKey("CLIENT_SECRET")).toBe(true);
    });

    it("detects SECRET_KEY", () => {
      expect(isSensitiveKey("SECRET_KEY")).toBe(true);
    });

    it("detects JWT_SECRET", () => {
      expect(isSensitiveKey("JWT_SECRET")).toBe(true);
    });

    it("is case insensitive for secret", () => {
      expect(isSensitiveKey("secret")).toBe(true);
      expect(isSensitiveKey("Secret")).toBe(true);
      expect(isSensitiveKey("SECRET")).toBe(true);
    });

    it("matches secret with any separator or character", () => {
      expect(isSensitiveKey("my.secret")).toBe(true);
      expect(isSensitiveKey("MY SECRET")).toBe(true);
      expect(isSensitiveKey("secret123")).toBe(true);
    });
  });

  describe("password patterns", () => {
    it("detects PASSWORD", () => {
      expect(isSensitiveKey("PASSWORD")).toBe(true);
    });

    it("detects DB_PASSWORD", () => {
      expect(isSensitiveKey("DB_PASSWORD")).toBe(true);
    });

    it("detects PASS at end of string", () => {
      expect(isSensitiveKey("DBPASS")).toBe(true);
      expect(isSensitiveKey("USER_PASS")).toBe(true);
    });

    it("detects PASSWD at end of string", () => {
      expect(isSensitiveKey("DBPASSWD")).toBe(true);
      expect(isSensitiveKey("USER_PASSWD")).toBe(true);
    });

    it("does not match PASS in middle of word", () => {
      // PASS pattern requires end-of-string match
      expect(isSensitiveKey("PASSPORT")).toBe(false);
      expect(isSensitiveKey("PASSENGER")).toBe(false);
    });

    it("is case insensitive for password", () => {
      expect(isSensitiveKey("password")).toBe(true);
      expect(isSensitiveKey("Password")).toBe(true);
    });
  });

  describe("token patterns", () => {
    it("detects TOKEN", () => {
      expect(isSensitiveKey("TOKEN")).toBe(true);
    });

    it("detects ACCESS_TOKEN", () => {
      expect(isSensitiveKey("ACCESS_TOKEN")).toBe(true);
    });

    it("detects REFRESH_TOKEN", () => {
      expect(isSensitiveKey("REFRESH_TOKEN")).toBe(true);
    });

    it("detects BEARER_TOKEN", () => {
      expect(isSensitiveKey("BEARER_TOKEN")).toBe(true);
    });

    it("detects token anywhere in string", () => {
      expect(isSensitiveKey("MY_TOKEN_HERE")).toBe(true);
      expect(isSensitiveKey("TOKENIZED")).toBe(true);
    });
  });

  describe("private key patterns", () => {
    it("detects PRIVATE_KEY", () => {
      expect(isSensitiveKey("PRIVATE_KEY")).toBe(true);
    });

    it("detects PRIVATEKEY without separator", () => {
      expect(isSensitiveKey("PRIVATEKEY")).toBe(true);
    });

    it("detects PRIVATE-KEY with hyphen", () => {
      expect(isSensitiveKey("PRIVATE-KEY")).toBe(true);
    });

    it("detects RSA_PRIVATE_KEY", () => {
      expect(isSensitiveKey("RSA_PRIVATE_KEY")).toBe(true);
    });
  });

  describe("auth patterns", () => {
    it("detects AUTH", () => {
      expect(isSensitiveKey("AUTH")).toBe(true);
    });

    it("detects AUTH_TOKEN", () => {
      expect(isSensitiveKey("AUTH_TOKEN")).toBe(true);
    });

    it("detects AUTHORIZATION", () => {
      expect(isSensitiveKey("AUTHORIZATION")).toBe(true);
    });

    it("detects BASIC_AUTH", () => {
      expect(isSensitiveKey("BASIC_AUTH")).toBe(true);
    });
  });

  describe("credential patterns", () => {
    it("detects CREDENTIAL", () => {
      expect(isSensitiveKey("CREDENTIAL")).toBe(true);
    });

    it("detects CREDENTIALS", () => {
      expect(isSensitiveKey("CREDENTIALS")).toBe(true);
    });

    it("detects GCP_CREDENTIALS", () => {
      expect(isSensitiveKey("GCP_CREDENTIALS")).toBe(true);
    });
  });

  describe("database URL patterns", () => {
    it("detects DATABASE_URL", () => {
      expect(isSensitiveKey("DATABASE_URL")).toBe(true);
    });

    it("detects DATABASEURL without separator", () => {
      expect(isSensitiveKey("DATABASEURL")).toBe(true);
    });

    it("detects DATABASE-URL with hyphen", () => {
      expect(isSensitiveKey("DATABASE-URL")).toBe(true);
    });
  });

  describe("connection string patterns", () => {
    it("detects CONNECTION_STRING", () => {
      expect(isSensitiveKey("CONNECTION_STRING")).toBe(true);
    });

    it("detects CONNECTIONSTRING without separator", () => {
      expect(isSensitiveKey("CONNECTIONSTRING")).toBe(true);
    });

    it("detects DB_CONNECTION_STRING", () => {
      expect(isSensitiveKey("DB_CONNECTION_STRING")).toBe(true);
    });
  });

  describe("AWS patterns", () => {
    it("detects AWS_ACCESS_KEY_ID", () => {
      expect(isSensitiveKey("AWS_ACCESS_KEY_ID")).toBe(true);
    });

    it("detects AWS_SECRET_ACCESS_KEY", () => {
      expect(isSensitiveKey("AWS_SECRET_ACCESS_KEY")).toBe(true);
    });

    it("detects AWS_SESSION_TOKEN", () => {
      expect(isSensitiveKey("AWS_SESSION_TOKEN")).toBe(true);
    });

    it("detects AWS-REGION with hyphen", () => {
      expect(isSensitiveKey("AWS-REGION")).toBe(true);
    });

    it("requires AWS at start with separator", () => {
      // Pattern is ^aws[_-] so requires underscore or hyphen after AWS
      expect(isSensitiveKey("AWS_KEY")).toBe(true);
      expect(isSensitiveKey("AWS-KEY")).toBe(true);
      expect(isSensitiveKey("aws_key")).toBe(true);
    });

    it("does not match AWS without separator", () => {
      // AWSKEY without separator - only matches if another pattern matches
      // AWS alone or AWSKEY without underscore/hyphen does not match ^aws[_-]
      expect(isSensitiveKey("AWS")).toBe(false);
      expect(isSensitiveKey("AWSKEY")).toBe(false);
    });

    it("does not match AWS in middle of string", () => {
      expect(isSensitiveKey("MY_AWS_STUFF")).toBe(false);
      expect(isSensitiveKey("NOT_AWS_REGION")).toBe(false);
    });
  });

  describe("Stripe patterns", () => {
    it("detects STRIPE_SECRET_KEY", () => {
      expect(isSensitiveKey("STRIPE_SECRET_KEY")).toBe(true);
    });

    it("detects STRIPE_PUBLISHABLE_KEY", () => {
      expect(isSensitiveKey("STRIPE_PUBLISHABLE_KEY")).toBe(true);
    });

    it("detects STRIPE-API-KEY with hyphens", () => {
      expect(isSensitiveKey("STRIPE-API-KEY")).toBe(true);
    });

    it("requires STRIPE at start with separator", () => {
      expect(isSensitiveKey("STRIPE_KEY")).toBe(true);
      expect(isSensitiveKey("STRIPE-KEY")).toBe(true);
      expect(isSensitiveKey("stripe_key")).toBe(true);
    });

    it("does not match STRIPE without separator", () => {
      expect(isSensitiveKey("STRIPE")).toBe(false);
      expect(isSensitiveKey("STRIPEKEY")).toBe(false);
    });

    it("does not match STRIPE in middle of string", () => {
      expect(isSensitiveKey("MY_STRIPE_STUFF")).toBe(false);
      expect(isSensitiveKey("NOT_STRIPE_KEY")).toBe(false);
    });
  });

  describe("GitHub token patterns", () => {
    it("detects GITHUB_TOKEN", () => {
      expect(isSensitiveKey("GITHUB_TOKEN")).toBe(true);
    });

    it("detects GITHUBTOKEN without separator", () => {
      // Pattern is ^github[_-]?token so separator is optional
      expect(isSensitiveKey("GITHUBTOKEN")).toBe(true);
    });

    it("detects GITHUB-TOKEN with hyphen", () => {
      expect(isSensitiveKey("GITHUB-TOKEN")).toBe(true);
    });

    it("does not match GITHUB without TOKEN suffix", () => {
      // Only matches if followed by token
      expect(isSensitiveKey("GITHUB")).toBe(false);
      expect(isSensitiveKey("GITHUB_USER")).toBe(false);
      expect(isSensitiveKey("GITHUB_REPO")).toBe(false);
    });

    it("matches MY_GITHUB_TOKEN because TOKEN is detected", () => {
      // Note: matches TOKEN pattern, not GITHUB_TOKEN pattern
      expect(isSensitiveKey("MY_GITHUB_TOKEN")).toBe(true);
    });
  });

  describe("NPM token patterns", () => {
    it("detects NPM_TOKEN", () => {
      expect(isSensitiveKey("NPM_TOKEN")).toBe(true);
    });

    it("detects NPMTOKEN without separator", () => {
      // Pattern is ^npm[_-]?token so separator is optional
      expect(isSensitiveKey("NPMTOKEN")).toBe(true);
    });

    it("detects NPM-TOKEN with hyphen", () => {
      expect(isSensitiveKey("NPM-TOKEN")).toBe(true);
    });

    it("does not match NPM without TOKEN suffix", () => {
      expect(isSensitiveKey("NPM")).toBe(false);
      expect(isSensitiveKey("NPM_REGISTRY")).toBe(false);
    });
  });

  describe("OpenAI patterns", () => {
    it("detects OPENAI_API_KEY", () => {
      expect(isSensitiveKey("OPENAI_API_KEY")).toBe(true);
    });

    it("detects OPENAI_KEY", () => {
      expect(isSensitiveKey("OPENAI_KEY")).toBe(true);
    });

    it("detects OPENAI alone", () => {
      // Pattern is ^openai which matches start of string
      expect(isSensitiveKey("OPENAI")).toBe(true);
    });

    it("detects any key starting with OPENAI", () => {
      expect(isSensitiveKey("OPENAI_ANYTHING")).toBe(true);
      expect(isSensitiveKey("OPENAIKEY")).toBe(true);
    });
  });

  describe("Anthropic patterns", () => {
    it("detects ANTHROPIC_API_KEY", () => {
      expect(isSensitiveKey("ANTHROPIC_API_KEY")).toBe(true);
    });

    it("detects ANTHROPIC_KEY", () => {
      expect(isSensitiveKey("ANTHROPIC_KEY")).toBe(true);
    });

    it("detects ANTHROPIC alone", () => {
      expect(isSensitiveKey("ANTHROPIC")).toBe(true);
    });

    it("does not match ANTHROPIC in middle of string", () => {
      expect(isSensitiveKey("MY_ANTHROPIC")).toBe(false);
      expect(isSensitiveKey("USE_ANTHROPIC_MODEL")).toBe(false);
    });
  });

  describe("Supabase patterns", () => {
    it("detects SUPABASE_URL", () => {
      expect(isSensitiveKey("SUPABASE_URL")).toBe(true);
    });

    it("detects SUPABASE_ANON_KEY", () => {
      expect(isSensitiveKey("SUPABASE_ANON_KEY")).toBe(true);
    });

    it("detects SUPABASE_SERVICE_ROLE_KEY", () => {
      expect(isSensitiveKey("SUPABASE_SERVICE_ROLE_KEY")).toBe(true);
    });

    it("detects SUPABASE alone", () => {
      expect(isSensitiveKey("SUPABASE")).toBe(true);
    });
  });

  describe("Redis patterns", () => {
    it("detects REDIS_URL", () => {
      expect(isSensitiveKey("REDIS_URL")).toBe(true);
    });

    it("detects REDIS_PASSWORD", () => {
      expect(isSensitiveKey("REDIS_PASSWORD")).toBe(true);
    });

    it("detects REDIS alone", () => {
      expect(isSensitiveKey("REDIS")).toBe(true);
    });

    it("detects any key starting with REDIS", () => {
      expect(isSensitiveKey("REDIS_HOST")).toBe(true);
      expect(isSensitiveKey("REDISCLOUD")).toBe(true);
    });
  });

  describe("MongoDB patterns", () => {
    it("detects MONGO_URI", () => {
      expect(isSensitiveKey("MONGO_URI")).toBe(true);
    });

    it("detects MONGODB_URL", () => {
      expect(isSensitiveKey("MONGODB_URL")).toBe(true);
    });

    it("detects MONGO alone", () => {
      expect(isSensitiveKey("MONGO")).toBe(true);
    });
  });

  describe("PostgreSQL patterns", () => {
    it("detects POSTGRES_URL", () => {
      expect(isSensitiveKey("POSTGRES_URL")).toBe(true);
    });

    it("detects POSTGRES_PASSWORD", () => {
      expect(isSensitiveKey("POSTGRES_PASSWORD")).toBe(true);
    });

    it("detects POSTGRES alone", () => {
      expect(isSensitiveKey("POSTGRES")).toBe(true);
    });

    it("detects POSTGRESQL variations", () => {
      expect(isSensitiveKey("POSTGRESQL_URL")).toBe(true);
    });
  });

  describe("MySQL patterns", () => {
    it("detects MYSQL_URL", () => {
      expect(isSensitiveKey("MYSQL_URL")).toBe(true);
    });

    it("detects MYSQL_PASSWORD", () => {
      expect(isSensitiveKey("MYSQL_PASSWORD")).toBe(true);
    });

    it("detects MYSQL alone", () => {
      expect(isSensitiveKey("MYSQL")).toBe(true);
    });
  });

  describe("false positives - non-sensitive keys", () => {
    it("does not match NODE_ENV", () => {
      expect(isSensitiveKey("NODE_ENV")).toBe(false);
    });

    it("does not match PORT", () => {
      expect(isSensitiveKey("PORT")).toBe(false);
    });

    it("does not match HOST", () => {
      expect(isSensitiveKey("HOST")).toBe(false);
    });

    it("does not match DEBUG", () => {
      expect(isSensitiveKey("DEBUG")).toBe(false);
    });

    it("does not match LOG_LEVEL", () => {
      expect(isSensitiveKey("LOG_LEVEL")).toBe(false);
    });

    it("does not match TIMEZONE", () => {
      expect(isSensitiveKey("TIMEZONE")).toBe(false);
    });

    it("does not match APP_NAME", () => {
      expect(isSensitiveKey("APP_NAME")).toBe(false);
    });

    it("does not match VERSION", () => {
      expect(isSensitiveKey("VERSION")).toBe(false);
    });

    it("does not match ENVIRONMENT", () => {
      expect(isSensitiveKey("ENVIRONMENT")).toBe(false);
    });

    it("does not match BASE_URL", () => {
      expect(isSensitiveKey("BASE_URL")).toBe(false);
    });

    it("does not match API_URL (URL without KEY)", () => {
      expect(isSensitiveKey("API_URL")).toBe(false);
    });

    it("does not match PUBLIC_KEY", () => {
      // Public keys are not sensitive, only private keys
      expect(isSensitiveKey("PUBLIC_KEY")).toBe(false);
    });

    it("does not match MAX_CONNECTIONS", () => {
      expect(isSensitiveKey("MAX_CONNECTIONS")).toBe(false);
    });

    it("does not match GITHUB_USER (no TOKEN suffix)", () => {
      expect(isSensitiveKey("GITHUB_USER")).toBe(false);
    });

    it("does not match NPM_REGISTRY (no TOKEN suffix)", () => {
      expect(isSensitiveKey("NPM_REGISTRY")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      expect(isSensitiveKey("")).toBe(false);
    });

    it("handles single character", () => {
      expect(isSensitiveKey("A")).toBe(false);
      expect(isSensitiveKey("1")).toBe(false);
    });

    it("handles very long key names", () => {
      const longKey =
        "VERY_LONG_ENVIRONMENT_VARIABLE_NAME_THAT_CONTAINS_API_KEY_SOMEWHERE_IN_THE_MIDDLE";
      expect(isSensitiveKey(longKey)).toBe(true);
    });

    it("handles key with only underscores", () => {
      expect(isSensitiveKey("___")).toBe(false);
    });

    it("handles key with numbers", () => {
      expect(isSensitiveKey("API_KEY_123")).toBe(true);
      expect(isSensitiveKey("SECRET_V2")).toBe(true);
      expect(isSensitiveKey("V1_TOKEN")).toBe(true);
    });

    it("handles key starting with numbers", () => {
      expect(isSensitiveKey("123_API_KEY")).toBe(true);
      expect(isSensitiveKey("2FA_TOKEN")).toBe(true);
    });
  });

  describe("special characters", () => {
    it("handles keys with dots in patterns that match anywhere", () => {
      // SECRET pattern matches anywhere, so dot separator works
      expect(isSensitiveKey("my.secret")).toBe(true);
      expect(isSensitiveKey("app.token")).toBe(true);
    });

    it("handles keys with mixed separators", () => {
      expect(isSensitiveKey("API_KEY-SECRET")).toBe(true);
      expect(isSensitiveKey("MY-API_KEY")).toBe(true);
    });

    it("handles keys with spaces in patterns that match anywhere", () => {
      expect(isSensitiveKey("MY SECRET")).toBe(true);
      expect(isSensitiveKey("the password is")).toBe(true);
    });
  });

  describe("unicode and special inputs", () => {
    it("handles unicode characters", () => {
      expect(isSensitiveKey("API_KEY_CAFE")).toBe(true);
      expect(isSensitiveKey("SECRET_VALUE")).toBe(true);
    });

    it("handles emoji in key name", () => {
      // Should still detect sensitive patterns
      expect(isSensitiveKey("API_KEY_EMOJI")).toBe(true);
    });

    it("handles newlines in key (edge case)", () => {
      expect(isSensitiveKey("API\nKEY")).toBe(false);
      expect(isSensitiveKey("SECRET\n")).toBe(true);
    });

    it("handles tab characters", () => {
      expect(isSensitiveKey("API\tKEY")).toBe(false);
      expect(isSensitiveKey("\tSECRET")).toBe(true);
    });
  });

  describe("case sensitivity consistency", () => {
    const sensitivePatterns = [
      "api_key",
      "API_KEY",
      "Api_Key",
      "aPi_KeY",
      "secret",
      "SECRET",
      "Secret",
      "password",
      "PASSWORD",
      "Password",
      "token",
      "TOKEN",
      "Token",
    ];

    it.each(sensitivePatterns)("detects %s regardless of case", (pattern) => {
      expect(isSensitiveKey(pattern)).toBe(true);
    });
  });

  describe("common real-world environment variables", () => {
    const realWorldSensitive = [
      "GITHUB_TOKEN",
      "GITLAB_TOKEN",
      "BITBUCKET_TOKEN",
      "DOCKER_PASSWORD",
      "NPM_TOKEN",
      "PYPI_TOKEN",
      "GEM_HOST_API_KEY",
      "CODECOV_TOKEN",
      "COVERALLS_TOKEN",
      "SONAR_TOKEN",
      "SENTRY_AUTH_TOKEN",
      "DATADOG_API_KEY",
      "NEW_RELIC_API_KEY",
      "SLACK_TOKEN",
      "SLACK_WEBHOOK_SECRET",
      "TWILIO_AUTH_TOKEN",
      "SENDGRID_API_KEY",
      "MAILGUN_API_KEY",
      "CLOUDFLARE_API_TOKEN",
      "HEROKU_API_KEY",
      "VERCEL_TOKEN",
      "NETLIFY_AUTH_TOKEN",
      "FIREBASE_TOKEN",
      "GOOGLE_APPLICATION_CREDENTIALS",
      "AZURE_CLIENT_SECRET",
      "JWT_SECRET",
      "SESSION_SECRET",
      // Note: ENCRYPTION_KEY and SIGNING_KEY do NOT match current patterns
      // as they have KEY but not preceded by API
    ];

    it.each(realWorldSensitive)(
      "correctly identifies %s as sensitive",
      (key) => {
        expect(isSensitiveKey(key)).toBe(true);
      }
    );

    const realWorldNonSensitive = [
      "NODE_ENV",
      "PORT",
      "HOST",
      "HOSTNAME",
      "DEBUG",
      "LOG_LEVEL",
      "TZ",
      "LANG",
      "LC_ALL",
      "PATH",
      "HOME",
      "USER",
      "SHELL",
      "TERM",
      "EDITOR",
      "PAGER",
      "CI",
      "CONTINUOUS_INTEGRATION",
      "BUILD_NUMBER",
      "BRANCH_NAME",
      "COMMIT_SHA",
      "TAG_NAME",
      "NEXT_PUBLIC_API_URL",
      "REACT_APP_BASE_URL",
      "VITE_APP_TITLE",
      "APP_VERSION",
      "FEATURE_FLAG_ENABLED",
      "MAX_UPLOAD_SIZE",
      "CACHE_TTL",
      "RATE_LIMIT",
      "ENCRYPTION_KEY", // Does not match - KEY without API prefix
      "SIGNING_KEY", // Does not match - KEY without API prefix
    ];

    it.each(realWorldNonSensitive)(
      "correctly identifies %s as non-sensitive",
      (key) => {
        expect(isSensitiveKey(key)).toBe(false);
      }
    );
  });

  describe("boundary conditions for prefix patterns", () => {
    it("AWS prefix requires start of string with separator", () => {
      expect(isSensitiveKey("AWS_KEY")).toBe(true);
      expect(isSensitiveKey("AWS-KEY")).toBe(true);
      expect(isSensitiveKey("aws_key")).toBe(true);
      expect(isSensitiveKey("NOT_AWS_KEY")).toBe(false);
    });

    it("STRIPE prefix requires start of string with separator", () => {
      expect(isSensitiveKey("STRIPE_KEY")).toBe(true);
      expect(isSensitiveKey("STRIPE-KEY")).toBe(true);
      expect(isSensitiveKey("stripe_key")).toBe(true);
      expect(isSensitiveKey("NOT_STRIPE_KEY")).toBe(false);
    });

    it("OPENAI prefix requires start of string", () => {
      expect(isSensitiveKey("OPENAI_KEY")).toBe(true);
      expect(isSensitiveKey("MY_OPENAI_KEY")).toBe(false);
    });

    it("ANTHROPIC prefix requires start of string", () => {
      expect(isSensitiveKey("ANTHROPIC_KEY")).toBe(true);
      expect(isSensitiveKey("MY_ANTHROPIC")).toBe(false);
    });

    it("SUPABASE prefix requires start of string", () => {
      expect(isSensitiveKey("SUPABASE_URL")).toBe(true);
      expect(isSensitiveKey("MY_SUPABASE")).toBe(false);
    });

    it("REDIS prefix requires start of string", () => {
      expect(isSensitiveKey("REDIS_URL")).toBe(true);
      expect(isSensitiveKey("MY_REDIS")).toBe(false);
    });

    it("MONGO prefix requires start of string", () => {
      expect(isSensitiveKey("MONGO_URI")).toBe(true);
      expect(isSensitiveKey("MY_MONGO")).toBe(false);
    });

    it("POSTGRES prefix requires start of string", () => {
      expect(isSensitiveKey("POSTGRES_URL")).toBe(true);
      expect(isSensitiveKey("MY_POSTGRES")).toBe(false);
    });

    it("MYSQL prefix requires start of string", () => {
      expect(isSensitiveKey("MYSQL_URL")).toBe(true);
      expect(isSensitiveKey("MY_MYSQL")).toBe(false);
    });
  });

  describe("overlapping patterns", () => {
    it("detects keys matching multiple patterns", () => {
      // Matches both SECRET and TOKEN
      expect(isSensitiveKey("SECRET_TOKEN")).toBe(true);
      // Matches both AUTH and PASSWORD
      expect(isSensitiveKey("AUTH_PASSWORD")).toBe(true);
      // Matches AWS prefix, SECRET, and contains KEY via api_key pattern
      expect(isSensitiveKey("AWS_SECRET_ACCESS_KEY")).toBe(true);
    });
  });

  describe("pattern specificity - security gaps documentation", () => {
    // These tests document known limitations/gaps in the detection
    it("documents that KEY alone without API prefix is not detected", () => {
      expect(isSensitiveKey("ENCRYPTION_KEY")).toBe(false);
      expect(isSensitiveKey("SIGNING_KEY")).toBe(false);
      expect(isSensitiveKey("LICENSE_KEY")).toBe(false);
      expect(isSensitiveKey("ACCESS_KEY")).toBe(false);
    });

    it("documents that non-standard DB prefixes are not detected", () => {
      // Only specific DB prefixes are matched at start
      expect(isSensitiveKey("COCKROACHDB_URL")).toBe(false);
      // Note: MARIADB_PASSWORD matches because of /password/i pattern
      expect(isSensitiveKey("MARIADB_PASSWORD")).toBe(true);
      // MARIADB alone doesn't match
      expect(isSensitiveKey("MARIADB_HOST")).toBe(false);
    });

    it("documents AWS/STRIPE require separator after prefix", () => {
      expect(isSensitiveKey("AWSKEY")).toBe(false);
      expect(isSensitiveKey("STRIPEKEY")).toBe(false);
    });

    it("documents patterns with strict separators do not match other separators", () => {
      // API.KEY has dot separator which is not _ or -
      expect(isSensitiveKey("API.KEY")).toBe(false);
      // PRIVATE.KEY has dot separator which is not _ or -
      expect(isSensitiveKey("PRIVATE.KEY")).toBe(false);
    });
  });

  describe("regex edge cases", () => {
    it("handles regex special characters in input", () => {
      // These should not cause regex errors
      expect(isSensitiveKey("API_KEY$")).toBe(true);
      expect(isSensitiveKey("SECRET^VALUE")).toBe(true);
      expect(isSensitiveKey("TOKEN*")).toBe(true);
      expect(isSensitiveKey("PASSWORD+")).toBe(true);
      expect(isSensitiveKey("AUTH?")).toBe(true);
      expect(isSensitiveKey("SECRET[1]")).toBe(true);
      expect(isSensitiveKey("TOKEN(1)")).toBe(true);
    });

    it("handles backslash in input", () => {
      // Backslash is not a valid separator for api[_-]?key pattern
      expect(isSensitiveKey("API\\KEY")).toBe(false);
      // But \SECRET still matches because /secret/i is found in the string
      expect(isSensitiveKey("\\SECRET")).toBe(true);
    });
  });

  describe("PASS/PASSWD end-of-string pattern edge cases", () => {
    it("detects PASS only at end of string", () => {
      expect(isSensitiveKey("PASS")).toBe(true);
      expect(isSensitiveKey("USERPASS")).toBe(true);
      expect(isSensitiveKey("DB_PASS")).toBe(true);
    });

    it("detects PASSWD only at end of string", () => {
      expect(isSensitiveKey("PASSWD")).toBe(true);
      expect(isSensitiveKey("USERPASSWD")).toBe(true);
      expect(isSensitiveKey("DB_PASSWD")).toBe(true);
    });

    it("does not match PASS when followed by other characters", () => {
      expect(isSensitiveKey("PASSING")).toBe(false);
      expect(isSensitiveKey("PASSTHROUGH")).toBe(false);
      // But PASSWORD matches because of /password/i pattern
      expect(isSensitiveKey("PASSWOOD")).toBe(false);
    });
  });

  describe("database pattern prefix behavior", () => {
    it("matches any key starting with database service prefix", () => {
      // Redis
      expect(isSensitiveKey("REDIS_HOST")).toBe(true);
      expect(isSensitiveKey("REDIS_PORT")).toBe(true);
      expect(isSensitiveKey("REDISCLOUD_URL")).toBe(true);

      // Mongo
      expect(isSensitiveKey("MONGO_HOST")).toBe(true);
      expect(isSensitiveKey("MONGODB_URI")).toBe(true);

      // Postgres
      expect(isSensitiveKey("POSTGRES_HOST")).toBe(true);
      expect(isSensitiveKey("POSTGRESQL_PASSWORD")).toBe(true);

      // MySQL
      expect(isSensitiveKey("MYSQL_HOST")).toBe(true);
      expect(isSensitiveKey("MYSQL_USER")).toBe(true);
    });
  });
});
