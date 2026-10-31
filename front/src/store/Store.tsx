import { configureStore } from '@reduxjs/toolkit';
import {
  useDispatch as useAppDispatch,
  useSelector as useAppSelector,
  TypedUseSelectorHook,
} from 'react-redux';
import CustomizerReducer from './customizer/CustomizerSlice';
import AutenticacaoReducer from './autenticacao/AutenticacaoSlice';

export const store = configureStore({
  reducer: {
    customizer: CustomizerReducer,
    autenticacao: AutenticacaoReducer,
  },
});

export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const { dispatch } = store;
export const useDispatch = () => useAppDispatch<AppDispatch>();
export const useSelector: TypedUseSelectorHook<AppState> = useAppSelector;

export default store;
