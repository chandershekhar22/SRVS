import React from 'react';

export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Connect Your Panel',
      description: 'Integrate via API or batch upload. Map your data fields to Quidinsights attributes in minutes.'
    },
    {
      number: '02',
      title: 'Define Criteria',
      description: 'Create survey projects with precise verification requirements like age, income, or job title.'
    },
    {
      number: '03',
      title: 'Verify & Deliver',
      description: 'ZK proofs generated instantly. Binary yes/no results. No PII exchanged.'
    }
  ];

  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">How It Works</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-6">
                {step.number}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
