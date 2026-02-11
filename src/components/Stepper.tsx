
import React from 'react';
import { Check } from 'lucide-react';

interface Step {
  id: number;
  label: string;
  icon: React.ReactNode;
}

interface StepperProps {
  currentStep: number;
  steps: Step[];
}

const Stepper: React.FC<StepperProps> = ({ currentStep, steps }) => {
  return (
    <div className="flex justify-between items-start px-6 py-6 bg-white relative">
      {/* Linha de fundo */}
      <div className="absolute top-[42px] left-10 right-10 h-[2px] bg-slate-100 z-0" />
      
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;

        return (
          <div key={step.id} className="flex flex-col items-center flex-1 relative z-10">
            {/* Círculo do Step */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                isCompleted 
                  ? 'bg-white border-green-500 text-green-600 shadow-sm' :
                isActive 
                  ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-100' :
                'bg-white border-slate-100 text-slate-300'
              }`}
            >
              {isCompleted ? <Check size={18} strokeWidth={3} /> : step.icon}
            </div>

            {/* Label do Step */}
            <span className={`mt-2 text-[9px] font-black uppercase tracking-widest text-center leading-tight ${
              isActive ? 'text-green-700' : 'text-slate-400'
            }`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default Stepper;
