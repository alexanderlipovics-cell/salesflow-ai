import React, { useState } from 'react';
import { MessageSquare, Phone, Edit, MoreVertical } from 'lucide-react';
import { Button } from '../ui/button';
import WhatsAppButton from '../WhatsAppButton';

interface LeadQuickActionsProps {
  leadId: string;
  leadName: string;
  email?: string;
  phone?: string;
}

const LeadQuickActions: React.FC<LeadQuickActionsProps> = ({
  leadId,
  leadName,
  email,
  phone
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleWhatsApp = () => {
    if (phone) {
      const message = `Hallo ${leadName}, wie geht es Ihnen?`;
      // Use the WhatsApp utility function
      import('../../utils/whatsapp').then(({ openWhatsApp }) => {
        openWhatsApp(phone, message);
      });
    }
  };

  const handleCall = () => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleEmail = () => {
    if (email) {
      const subject = `Follow-up: ${leadName}`;
      const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
      window.location.href = mailtoUrl;
    }
  };

  const handleEdit = () => {
    // Navigate to lead detail/edit page
    window.location.href = `/leads/${leadId}`;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Primary Actions */}
      <div className="flex gap-2">
        {phone && (
          <WhatsAppButton
            phone={phone}
            message={`Hallo ${leadName}, wie geht es Ihnen?`}
            variant="button"
            size="sm"
            className="flex items-center gap-1"
          >
            <span className="hidden sm:inline">WhatsApp</span>
          </WhatsAppButton>
        )}

        {phone && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleCall();
            }}
            className="flex items-center gap-1"
            title="Anrufen"
          >
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">Anrufen</span>
          </Button>
        )}

        {email && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleEmail();
            }}
            className="flex items-center gap-1"
            title="E-Mail schreiben"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">E-Mail</span>
          </Button>
        )}
      </div>

      {/* More Actions Menu */}
      <div className="relative">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-2"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>

        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <div className="absolute right-0 bottom-full mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Bearbeiten
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LeadQuickActions;
