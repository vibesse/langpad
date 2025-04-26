As a Senior Software Engineer, write a Redux selector that returns flow's steps and actions in the following format:

```json
{
  "steps": [{
    "actions": [{
      "model": "gpt4o",
      "temperature": 0.7,
      "messages": [{
        "role": "user",
        "content": [
          { "type": "text", "text": "Hello this is {{variable_1}} test.", "role": "user" },
          {
            "type": "file",
            "role": "user"
            "file": {
              "file_data": "base64,...",
            }
          }
        ]
      }]
    }, ...]
  }, ...]
}
```

Follow these instructions:

- All UI-specific fields from the Redux stores should be ommited.
- The selector should accept 2 params: flow_id (for which flow to generate the structure), replaceVarsAndFiles (boolean) - indicates whether to replace variables and replace file_id refs to actual file data.
- If replaceVarsAndFiles is true:
  - Replace variable references like {{variable_1}} to variables (available variables are stored in variables slice)
  - In the actions slice, you'll encounter file_id's as well. Those are files that are stored in files slice. You need to map and return file_data directly.
- If replaceVarsAndFiles is false/undefined:
- Return contents as is.
- If system prompt is present in the action, you need to add it as the first message to the messages array, for example:

```json
  ...
  "content": [
    { "type": "text", "text": "You are a...", "role": "system" },
  }
```

- Create a variation of this selector, that does JSON.stringify(obj, null, 2) on the output, returns the output as string, and replace file_data large base64s with "base64,..."
- Don't add exsessive comments, code should be clean and readable. If there's a better way to organize this (given you fully understood what we require) – feel free to suggest as well.
