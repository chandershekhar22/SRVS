import React from 'react';

export default function Features() {
  const features = [
    {
      icon: '🛡️',
      title: 'Zero-Knowledge Proofs',
      description: 'Verify attributes without exposing personal data'
    },
    {
      icon: '⚡',
      title: 'Instant Verification',
      description: 'Real-time proof generation in milliseconds'
    },
    {
      icon: '🌍',
      title: 'GDPR & CCPA Compliant',
      description: 'Built for global privacy regulations'
    },
    {
      icon: '🔗',
      title: 'Easy Integration',
      description: 'Simple API for panel and insight companies'
    }
  ];

  return (
    <section className="py-16 px-4 bg-white">
      <div className="container mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <div key={index} className="p-8 rounded-xl bg-gray-50 border border-gray-100 hover:border-purple-200 transition">
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="font-bold text-lg text-gray-900 mb-2">{feature.title}</h3>
            <p className="text-gray-600 text-sm">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
