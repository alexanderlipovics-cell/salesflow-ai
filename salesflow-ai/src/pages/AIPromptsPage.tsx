import React from 'react';
import AIPromptsPanel from '../components/chat/AIPromptsPanel';
import WhatsAppIntegrationPanel from '../components/chat/WhatsAppIntegrationPanel';
import GPTFunctionCallsDemo from '../components/chat/GPTFunctionCallsDemo';

export default function AIPromptsPage() {
  const handlePromptSelect = (prompt: any) => {
    console.log('Selected prompt:', prompt);
    // TODO: Execute prompt with input values
  };

  const handleWhatsAppSend = (message: string) => {
    console.log('WhatsApp sent:', message);
    // Success handling
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🤖 AI Prompts & Interactive Chat
          </h1>
          <p className="text-gray-600">
            Wiederverwendbare Sales-Prompts + WhatsApp Integration + GPT Function Calls
          </p>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* AI Prompts Panel */}
          <div className="lg:col-span-1">
            <AIPromptsPanel onPromptSelect={handlePromptSelect} />
          </div>

          {/* Interactive Chat */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg h-[600px]">
              <GPTFunctionCallsDemo />
            </div>
          </div>
        </div>

        {/* WhatsApp Integration */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <WhatsAppIntegrationPanel 
              leadPhone="+491234567890"
              onSendWhatsApp={handleWhatsAppSend}
            />
          </div>

          {/* Stats/Info Panel */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">📊 System Features</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">12+</div>
                <div className="text-sm text-gray-600">Standard AI Prompts</div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-green-600">3</div>
                <div className="text-sm text-gray-600">WhatsApp Provider</div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">GPT-4</div>
                <div className="text-sm text-gray-600">Function Calling</div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-yellow-600">∞</div>
                <div className="text-sm text-gray-600">Interactive Options</div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">✅</span>
                <div>
                  <h4 className="font-semibold">Wiederverwendbare Prompts</h4>
                  <p className="text-sm text-gray-600">
                    12+ vordefinierte Sales-Szenarien für Einwände, Upselling, Coaching, etc.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-2xl">✅</span>
                <div>
                  <h4 className="font-semibold">Multi-Channel Follow-ups</h4>
                  <p className="text-sm text-gray-600">
                    WhatsApp (UltraMsg/360dialog/Twilio), E-Mail, In-App Chat
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-2xl">✅</span>
                <div>
                  <h4 className="font-semibold">Interactive GPT Chat</h4>
                  <p className="text-sm text-gray-600">
                    Klickbare Optionen für schnelle User-Auswahl statt Freitext
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-2xl">✅</span>
                <div>
                  <h4 className="font-semibold">GPT Function Calls</h4>
                  <p className="text-sm text-gray-600">
                    KI kann autonom E-Mails senden, WhatsApp-Nachrichten erstellen, Reminder setzen
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

