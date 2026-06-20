// Built as a Compound Component
import React, { createContext, useContext } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FieldLegend, FieldSet } from '@/components/ui/field';

const CardFormContext = createContext(null);

const useCardForm = () => {
  const context = useContext(CardFormContext);
  if (!context) {
    throw new Error(
      'CardForm sub-components must be rendered within a <CardForm> parent.',
    );
  }
  return context;
};

// Main component
export const CardForm = ({ children, id, action }) => {
  return (
    <CardFormContext.Provider value={{ id, action }}>
      <Card asChild>
        <section>{children}</section>
      </Card>
    </CardFormContext.Provider>
  );
};

// Subcomponents
const CardFormHeader = ({ children, className }) => {
  return (
    <CardHeader className={`px-8 py-2 ${className || ''}`}>
      {children}
    </CardHeader>
  );
};

const CardFormTitle = ({ children, headingLevel = 'h1', className }) => {
  const HeadingTag = headingLevel;
  return (
    <CardTitle className={`text-3xl ${className || ''}`} asChild>
      <HeadingTag>{children}</HeadingTag>
    </CardTitle>
  );
};

const CardFormDescription = ({ children, className }) => {
  return <CardDescription className={className}>{children}</CardDescription>;
};

const CardFormContent = ({ children, legend, className }) => {
  const { id, action } = useCardForm();

  return (
    <CardContent asChild className={`px-8 py-2 ${className || ''}`}>
      <form id={id} action={action} noValidate>
        <FieldSet className='min-w-0'>
          {legend && <FieldLegend className='hidden'>{legend}</FieldLegend>}
          {children}
        </FieldSet>
      </form>
    </CardContent>
  );
};

const CardFormFooter = ({ children, className }) => {
  return (
    <CardFooter className={`px-8 ${className || ''}`}>{children}</CardFooter>
  );
};

CardForm.Header = CardFormHeader;
CardForm.Title = CardFormTitle;
CardForm.Description = CardFormDescription;
CardForm.Content = CardFormContent;
CardForm.Footer = CardFormFooter;
