# Logger

## State

- Create logs slice in redux. There should be an array of logs.
- Each log can have content and level (info, warn, error), timestamp
- There should be actions to create, update, delete certain log entries.
- Create a well designed way to add logs in a streaming fashion. For example, for streaming OpenAI response.

## Component

- Create a new log render component.
- Different log levels logs should have a appropriate color (red for error, standard for info, etc)
- It should have a look and feel of a terminal (although, light/dark modes should not break and still look great)
- Logs should be formatted in a cool terminal-like fashion like [timestamp]: log_contents...
- Font should be monospace, use tailwind classes for all styling.

## Other

- When the app just loads, add logs when the model list is fetched (just as the app loads)
