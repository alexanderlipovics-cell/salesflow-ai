import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { Lock, Sparkles } from "lucide-react";
import { useFeatureGate } from "../context/FeatureGateContext";
import { usePricingModal } from "../context/PricingModalContext";
import { PLAN_LABELS } from "../lib/plans";

const FeatureGateModal = () => {
  const { isOpen, featureLabel, requiredPlan, closeGate } = useFeatureGate();
  const { openPricing } = usePricingModal();

  const handleUpgrade = () => {
    openPricing(requiredPlan);
    closeGate();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeGate}>
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
              <Dialog.Panel className="glass-panel w-full max-w-md p-8">
                <div className="flex items-center gap-3 text-salesflow-accent">
                  <Lock className="h-5 w-5" />
                  <Dialog.Title className="text-lg font-semibold">
                    Feature gesperrt
                  </Dialog.Title>
                </div>
                <p className="mt-4 text-sm text-gray-300">
                  Upgrade auf {PLAN_LABELS[requiredPlan] || requiredPlan} um{" "}
                  <span className="font-semibold text-white">
                    {featureLabel}
                  </span>{" "}
                  freizuschalten.
                </p>
                <button
                  onClick={handleUpgrade}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-salesflow-accent to-salesflow-accent-strong px-4 py-3 font-semibold text-black transition hover:scale-[1.01]"
                >
                  <Sparkles className="h-4 w-4" />
                  Upgrade jetzt
                </button>
                <button
                  onClick={closeGate}
                  className="mt-3 w-full rounded-2xl border border-white/10 px-4 py-2 text-sm text-gray-400 hover:text-white"
                >
                  Später
                </button>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default FeatureGateModal;
