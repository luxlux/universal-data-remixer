
import React from 'react';
import { ActionButtonProps } from '../types.js';

const ActionButton: React.FC<ActionButtonProps> = ({ 
  onClick, 
  disabled = false, 
  children, 
  className = '', 
  title,
  type = 'button',
  variant = 'primary'
}) => {
  const baseStyle = "px-4 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-colors duration-150 ease-in-out flex items-center justify-center space-x-2 text-sm disabled:cursor-not-allowed";
  
  let variantStyle = "";
  switch (variant) {
    case 'primary': // Amazon Orange
      variantStyle = "bg-[#FF9900] hover:bg-[#E68A00] text-[#131A22] focus:ring-[#FF9900] disabled:bg-[#4A596D] disabled:text-gray-500";
      break;
    case 'secondary': // Amazon Cyan/Teal or a less prominent color
      variantStyle = "bg-[#007B99] hover:bg-[#005F7A] text-white focus:ring-[#007B99] disabled:bg-[#4A596D] disabled:text-gray-500";
      break;
    case 'danger': // Red
      variantStyle = "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 disabled:bg-red-400 disabled:text-red-200";
      break;
    case 'warning': // Usually yellow, can use a lighter orange or a distinct color
       variantStyle = "bg-yellow-500 hover:bg-yellow-600 text-[#131A22] focus:ring-yellow-500 disabled:bg-yellow-300 disabled:text-yellow-100";
       break;
    case 'ghost': // Transparent background, text color from context or a light grey
      variantStyle = "bg-transparent hover:bg-[#3B4859] text-gray-300 hover:text-white focus:ring-[#4A596D] border border-[#4A596D] disabled:text-gray-500 disabled:border-gray-600";
      break;
    default: // Fallback to primary
      variantStyle = "bg-[#FF9900] hover:bg-[#E68A00] text-[#131A22] focus:ring-[#FF9900] disabled:bg-[#4A596D] disabled:text-gray-500";
      break;
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variantStyle} ${className}`}
      title={title}
    >
      {children}
    </button>
  );
};

export default ActionButton;