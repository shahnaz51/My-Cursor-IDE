import { OpenAI } from 'openai';
import { exec } from 'node:child_process';

const OPENAI_API_KEY = 'XXXXXXXXXXXXXXXXXXXXXXXXXX'; // Replace with API key

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

function getWeatherInfo(city) {
    return `${city} has 28 Degree C`;
}

function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, function (err, stdout, stderr) {
            if (err) {
                return reject(err);
            }
            resolve(`stdout: ${stdout}\nstderr: ${stderr}`);
        });
    });
}

const TOOL_MAP = {
    getWeatherInfo: getWeatherInfo,
    executeCommand: executeCommand,
};

const SYSTEM_PROMPT = `
You are a helpful AI Assistant who is designed to resolve user queries.
You work on START, THINK, ACTION, OBSERVE, and OUTPUT mode.

In the START phase, the user gives a query to you.
Then, you THINK how to resolve that query at least 3-4 times and make sure that all is clear.
If there is a need to call a tool, you call an ACTION event with tool and input parameters.
If there is an action call, wait for the OBSERVE that is output of the tool.
Based on the OBSERVE from the previous step, you either OUTPUT or repeat the loop.

Rules:
- Always wait for the next step.
- Always output a single step and wait for the next step.
- Output must be strictly JSON
- Only call tool actions from available tools only
- Strictly follow the output format in JSON

Available Tools:
- getWeatherInfo(city: string): string
- executeCommand(command): string — Executes a given Linux command on user's device and returns the STDOUT and STDERR

Example:

START: What is weather of Noida?
THINK: The user is asking for the weather of Noida.
THINK: From the available tools, I must call getWeatherInfo tool for Noida as input.
ACTION: Call Tool getWeatherInfo (Noida)
OBSERVE: 36 Degree C
THINK: The output of getWeatherInfo for Noida is 36 Degree C
OUTPUT: Hey, the weather of Noida is 36 Degree C which is quite hot.

Input Example:
{"role": "user", "content": "What is weather of Noida?"}
{"step": "think", "content": "The user is asking for the weather of Noida"}
{"step": "think", "content": "From the available tools, I must call getWeatherInfo tool for Noida as input"}
{"step": "action", "tool": "getWeatherInfo", "input": "Noida"}
{"step": "observe", "content": "36 Degree C"}
{"step": "think", "content": "The output of getWeatherInfo for Noida is 36 Degree C"}
{"step": "output", "content": "Hey, the weather of Noida is 36 Degree C which is quite hot"}
`;

async function init() {
    const messages = [
        {
            role: 'system',
            content: SYSTEM_PROMPT,
        }
    ];

    const userQuery = 'Create a folder Calculator App and create a Calculator App with HTML, CSS and JS fully working in it';
    messages.push({ role: 'user', content: userQuery });

    while (true) {
        const response = await client.chat.completions.create({
            model: 'gpt-4',
            messages: messages
        });

        const content = response.choices[0].message.content;

        messages.push({
            role: 'assistant',
            content: content,
        });

        let parsed_response;
        try {
            parsed_response = JSON.parse(content);
        } catch (e) {
            console.error('❌ Invalid JSON from model:\n', content);
            break;
        }

        if (parsed_response.step === 'think') {
            console.log(`🤔 THINK: ${parsed_response.content}`);
            continue;
        }

        if (parsed_response.step === 'output') {
            console.log(`✅ OUTPUT: ${parsed_response.content}`);
            break;
        }

        if (parsed_response.step === 'action') {
            const tool = parsed_response.tool;
            const input = parsed_response.input;

            if (!TOOL_MAP[tool]) {
                console.error(`❌ Unknown tool: ${tool}`);
                break;
            }

            const value = await TOOL_MAP[tool](input);
            console.log(`🔧 ACTION: Tool "${tool}" called with input "${input}" → Result: ${value}`);

            messages.push({
                role: 'assistant',
                content: JSON.stringify({ step: "observe", content: value }),
            });
        }
    }
}

init();


















