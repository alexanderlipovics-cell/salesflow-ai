import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { FollowUpPanel, type FollowUpPanelProps } from "./FollowUpPanel";

interface FollowUpPanelDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  initialProps?: FollowUpPanelProps;
}

export function FollowUpPanelDialog(props: FollowUpPanelDialogProps) {
  const { open, onClose, title = "Follow-up erstellen", subtitle, initialProps } = props;

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl rounded-3xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl">
                <div className="space-y-4">
                  <div>
                    <Dialog.Title className="text-xl font-semibold text-white">
                      {title}
                    </Dialog.Title>
                    {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
                  </div>

                  <FollowUpPanel {...(initialProps ?? {})} />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}


