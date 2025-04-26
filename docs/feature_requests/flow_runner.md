# Flow runner

## State

- Create a new redux slice for "runs".
- Runs should be "per flow", even though it is possible to rerun a certain step or a certain action as well.
- It should reference and record each flow, each step and each action.
- It should record the outputs of each action and time it took to complete each action, each step and each flow (total).
- Develop a flow runner that takes following object (check out flowSelectors.ts file):

```json
{
  "steps": [
    {
      "actions": [
        {
          "model": "gpt-4o",
          "temperature": 0.5,
          "messages": [
            {
              "role": "system",
              "content": [
                {
                  "type": "text",
                  "text": "test",
                  "role": "system"
                }
              ]
            },
            {
              "role": "user",
              "content": [
                {
                  "type": "text",
                  "text": "test",
                  "role": "user"
                },
                {
                  "type": "file",
                  "role": "user",
                  "file": {
                    "file_data": "base64,..."
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "actions": [
        {
          "model": "gpt-4o",
          "temperature": 0.5,
          "messages": [
            {
              "role": "user",
              "content": [
                {
                  "type": "text",
                  "text": "test",
                  "role": "user"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

- Actions within a step execute in parallel, however steps execute in a sequence.
- The outputs of the model should be updated in a streaming manner.
- Organize the code in a maintable manner, identify where it's worth to split into different files.
- Integrate flow running functionality into the frontend.
  1. Add Run Flow button above the flow.
  2. There is button with Play Icon at the top of each action and at the top of each step. Those should run or rerun corresponding step/action.
- Add logs to the logger as well (log slice). Logs should be recorded at every step of the flow. When capturing streaming output from openai, the log with the output should also be updated in a streaming error.
