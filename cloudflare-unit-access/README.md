# Cloudflare Unit Access

This project implements a mini backend using Cloudflare Workers to manage unit codes and user access. It provides an API for storing unit codes, matching them to backend codes, and checking user access status for each unit.

## Project Structure

- **src/index.ts**: Entry point of the application, initializes the server and sets up routing.
- **src/routes/units.ts**: Handles routes related to unit codes, including retrieval and matching.
- **src/routes/access.ts**: Manages access-related routes, checking user access to units.
- **src/types/index.ts**: Contains TypeScript interfaces and types used throughout the application.
- **wrangler.toml**: Configuration file for Cloudflare Workers, specifying project settings.
- **package.json**: npm configuration file listing dependencies and scripts.
- **tsconfig.json**: TypeScript configuration file specifying compiler options.

## Setup Instructions

1. **Clone the repository**:

   ```
   git clone <repository-url>
   cd cloudflare-unit-access
   ```

2. **Install dependencies**:

   ```
   npm install
   ```

3. **Configure Cloudflare Workers**:
   - Update `wrangler.toml` with your Cloudflare account details.

4. **Deploy the application**:
   ```
   npx wrangler publish
   ```

## Usage

- The API provides endpoints to manage unit codes and check user access. Refer to the documentation in the respective route files for detailed usage instructions.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.
