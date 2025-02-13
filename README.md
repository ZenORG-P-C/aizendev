# Example Command Line AI

This project is a command-line interface (CLI) application built with React and Ink. It allows users to interact with an AI chatbot, manage chat sessions, and view AI-generated responses in real-time.

## Features

- **Session Management**: Start new chat sessions or continue existing ones.
- **Real-time AI Interaction**: Send messages and receive AI responses.
- **Database Integration**: Store and retrieve chat history using a database.
- **User-Friendly Interface**: Built with Ink for a rich command-line experience.

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- A running instance of a database compatible with the `db.ts` configuration

## Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/yourusername/example-command-line-ai.git
   cd example-command-line-ai
   ```

2. **Install dependencies**:

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**:
   - Create a `.env.local` file in the root directory.
   - Add necessary environment variables, such as database connection strings.

4. **Initialize the database**:
   - Ensure your database is running.
   - The application will automatically initialize tables on the first run.

## Usage

1. **Run the application**:

   ```bash
   npm start
   # or
   yarn start
   ```

2. **Interact with the AI**:
   - Use the arrow keys to navigate through sessions.
   - Type your message and press `Enter` to send it.
   - Type `/quit` to exit the application.

## Configuration

- **Webhook URL**: The application uses a webhook to communicate with an external AI service. Update the `N8N_WEBHOOK_URL` and `WEBHOOK_PATH` in `src/scripts/example_command_line_ai.tsx` if necessary.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Ink](https://github.com/vadimdemedes/ink) for the CLI framework
- [dotenv](https://github.com/motdotla/dotenv) for environment variable management
- [axios](https://github.com/axios/axios) for HTTP requests
