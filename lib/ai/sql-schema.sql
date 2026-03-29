-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type USER-DEFINED NOT NULL,
  balance numeric NOT NULL DEFAULT 0.00,
  color text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  credit_limit numeric,
  interest_rate numeric,
  minimum_payment numeric,
  billing_cycle text,
  due_date date,
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,
  amount numeric NOT NULL,
  period USER-DEFINED NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  CONSTRAINT budgets_pkey PRIMARY KEY (id),
  CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type USER-DEFINED NOT NULL,
  parent_category_id uuid,
  icon text,
  color text,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.loans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  principal_amount numeric NOT NULL,
  interest_rate numeric NOT NULL,
  term_months integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  monthly_payment numeric NOT NULL,
  status text NOT NULL,
  CONSTRAINT loans_pkey PRIMARY KEY (id),
  CONSTRAINT loans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT loans_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  first_name text,
  base_currency character varying DEFAULT 'USD'::character varying,
  theme_preference character varying DEFAULT 'light'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.recurring_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  category_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  amount numeric NOT NULL,
  frequency USER-DEFINED NOT NULL,
  start_date date NOT NULL,
  next_occurrence_date date NOT NULL,
  end_date date,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT recurring_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT recurring_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT recurring_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT recurring_transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  CONSTRAINT tags_pkey PRIMARY KEY (id),
  CONSTRAINT tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.transaction_tags (
  transaction_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT transaction_tags_pkey PRIMARY KEY (transaction_id, tag_id),
  CONSTRAINT transaction_tags_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id),
  CONSTRAINT transaction_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  category_id uuid,
  type USER-DEFINED NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0::numeric),
  date timestamp with time zone NOT NULL,
  destination_account_id uuid,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT transactions_destination_account_id_fkey FOREIGN KEY (destination_account_id) REFERENCES public.accounts(id)
);