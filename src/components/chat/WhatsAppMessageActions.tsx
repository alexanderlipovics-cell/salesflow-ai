import React from 'react';
import { MessageSquare, Copy, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import WhatsAppButton from '../WhatsAppButton';
import { parseWhatsAppFromMessage } from '../../utils/whatsapp';

interface WhatsAppMessageActionsProps {
  message: string;
  leadPhone?: string;
  leadName?: string;
  className?: string;
}

const WhatsAppMessageActions: React.FC<WhatsAppMessageActionsProps> = ({
  message,
  leadPhone,
  leadName,
  className = ''
}) => {
  const [copied, setCopied] = React.useState(false);

  // Try to parse WhatsApp info from the message
  const whatsappInfo = React.useMemo(() => {
    return parseWhatsAppFromMessage(message);
  }, [message]);

  // Use parsed phone or fallback to lead phone
  const phone = whatsappInfo?.phone || leadPhone;
  const whatsappMessage = whatsappInfo?.message || message;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  if (!phone) {
    // Just show copy button if no phone available
    return (
      <div className={`flex items-center gap-2 mt-3 ${className}`}>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Kopiert!' : 'Kopieren'}
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 mt-3 ${className}`}>
      {/* Copy Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={handleCopy}
        className="flex items-center gap-2"
      >
        <Copy className="w-4 h-4" />
        {copied ? 'Kopiert!' : 'Kopieren'}
      </Button>

      {/* WhatsApp Button */}
      <WhatsAppButton
        phone={phone}
        message={whatsappMessage}
        variant="button"
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
      >
        <MessageSquare className="w-4 h-4" />
        WhatsApp
      </WhatsAppButton>

      {/* External Link (fallback) */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => window.open(`https://wa.me/${phone}`, '_blank')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
        title="WhatsApp Web öffnen"
      >
        <ExternalLink className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default WhatsAppMessageActions;
