import React from 'react';

interface FormPageLayoutProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

const FormPageLayout: React.FC<FormPageLayoutProps> = ({ title, children, actions }) => {
  return (
    // REFACTOR: Menambahkan 'w-full max-w-6xl mx-auto' untuk membatasi lebar pada layar besar agar lebih enak dibaca.
    // REFACTOR: Mengurangi padding mobile menjadi 'p-3' untuk memberikan ruang lebih pada konten.
    <div className="p-3 sm:p-6 md:p-8 w-full max-w-6xl mx-auto">
      <div className="flex flex-col items-start justify-between gap-4 mb-6 md:flex-row md:items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-tm-dark">{title}</h1>
        {actions && <div className="flex items-center space-x-2">{actions}</div>}
      </div>
      <div className="p-4 sm:p-6 bg-white border border-gray-200/80 rounded-xl shadow-md">
        {children}
      </div>
    </div>
  );
};

export default FormPageLayout;