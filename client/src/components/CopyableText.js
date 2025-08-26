import React, { useState } from 'react';
import './CopyableText.css';

const CopyableText = ({ text, className = '', showCopyButton = true, placeholder = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!text || text.trim() === '') {
    return placeholder ? <span className="copyable-text-placeholder">{placeholder}</span> : null;
  }

  return (
    <div className={`copyable-text-container ${className}`}>
      <div className="copyable-text">
        {text.split('\n').map((line, index) => (
          <div key={index} className="text-line">
            {line || '\u00A0'} {/* Non-breaking space for empty lines */}
          </div>
        ))}
      </div>
      {showCopyButton && (
        <button
          className={`copy-button ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          title={copied ? '已复制!' : '复制文字'}
        >
          {copied ? '✓' : '📋'}
        </button>
      )}
    </div>
  );
};

export default CopyableText;