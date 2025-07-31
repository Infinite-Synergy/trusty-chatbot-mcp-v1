import { LettaClient } from '@letta-ai/letta-client';
import * as fs from 'fs';
import * as path from 'path';

async function setupAgent() {
  console.log('🚀 Setting up Letta agent...');

  // Check for API key
  const apiKey = process.env.LETTA_API_KEY;
  if (!apiKey) {
    console.error('❌ LETTA_API_KEY environment variable is required');
    console.log('📝 Please:');
    console.log('1. Create an account at https://app.letta.com');
    console.log('2. Get your API key from https://app.letta.com/api-keys');
    console.log('3. Copy env.example to .env.local and add your API key');
    process.exit(1);
  }

  try {
    // Initialize Letta client
    const client = new LettaClient({ token: apiKey });
    console.log('✅ Connected to Letta Cloud');

    // Check if agent ID already exists in .env.local
    const envPath = path.join(process.cwd(), '.env.local');
    let existingAgentId: string | null = null;

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const agentIdMatch = envContent.match(/LETTA_AGENT_ID=(.+)/);
      
      if (agentIdMatch && agentIdMatch[1] && agentIdMatch[1].trim() !== '' && agentIdMatch[1] !== 'agent-xxxxxxxxx') {
        existingAgentId = agentIdMatch[1].trim();
      }
    }

    let agentId: string = '';
    let useExistingAgent = false;

    if (existingAgentId) {
      console.log(`🔍 Found existing agent ID: ${existingAgentId}`);
      console.log('🧪 Validating existing agent...');

      try {
        // Test the existing agent
        const response = await client.agents.messages.create(existingAgentId, {
          messages: [{ role: "user", content: "Hello! Please introduce yourself briefly." }]
        });

        // Find the assistant's response
        let assistantResponse = null;
        for (const msg of response.messages) {
          if (msg.messageType === "assistant_message") {
            assistantResponse = msg.content;
            break;
          }
        }

        if (assistantResponse) {
          console.log('✅ Existing agent validation successful!');
          console.log('🎉 Agent response:', assistantResponse);
          agentId = existingAgentId;
          useExistingAgent = true;
        } else {
          throw new Error('No assistant response found');
        }
      } catch (error) {
        console.log('⚠️  Existing agent validation failed, creating new agent...');
        console.log('Error details:', error instanceof Error ? error.message : error);
      }
    }

    if (!useExistingAgent) {
      // Create agent with memory blocks
      console.log('🤖 Creating new chat agent...');
      const agent = await client.agents.create({
        memoryBlocks: [
          {
            label: "human",
            value: "The user is exploring Letta for the first time. They're interested in AI and building applications."
          },
          {
            label: "persona",
            value: "I am TrustyKitty, a helpful and knowledgeable AI assistant to help you with your data questions. I have persistent memory across conversations and can help with various tasks. My personality is friendly, professional, and encouraging."
          },
          {
            label: "project_context",
            value: "The user is working on a Next.js chat application integrated with Letta. This is a demo application to showcase Letta's capabilities.",
            description: "Stores information about the current project and technical context"
          }
        ],
        tools: ["web_search", "run_code"],
        model: "openai/gpt-4.1",
        embedding: "openai/text-embedding-3-small"
      });

      agentId = agent.id;
      console.log(`✅ Agent created with ID: ${agentId}`);

      // Test the new agent
      console.log('🧪 Testing new agent...');
      const response = await client.agents.messages.create(agentId, {
        messages: [{ role: "user", content: "Hello! Please introduce yourself." }]
      });

      // Find the assistant's response
      for (const msg of response.messages) {
        if (msg.messageType === "assistant_message") {
          console.log('🎉 Agent response:', msg.content);
          break;
        }
      }
    }

    // Update .env.local file with agent ID (only if we created a new one or if file doesn't exist)
    if (!useExistingAgent || !fs.existsSync(envPath)) {
      let envContent = '';
      
      // Read existing .env.local if it exists
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      // Update or add LETTA_AGENT_ID
      if (envContent.includes('LETTA_AGENT_ID=')) {
        envContent = envContent.replace(/LETTA_AGENT_ID=.*/g, `LETTA_AGENT_ID=${agentId}`);
      } else {
        envContent += `\nLETTA_AGENT_ID=${agentId}\n`;
      }

      // Add API key if not present
      if (!envContent.includes('LETTA_API_KEY=')) {
        envContent += `LETTA_API_KEY=${apiKey}\n`;
      }

      fs.writeFileSync(envPath, envContent);
      console.log('📝 Updated .env.local with agent ID');
    } else {
      console.log('📝 Using existing agent ID from .env.local');
    }

    console.log('\n✨ Setup complete! Your agent is ready to use.');
    console.log('💡 Run "npm run dev" to start the chat application');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

// Run the setup
setupAgent().catch(console.error); 