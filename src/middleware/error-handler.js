import { AppError } from '../utils/app-error.js';

// Los errores de Mongoose no son AppError, asi que sin traducirlos todos
// terminan como 500 "Internal server error" y el admin no ve la causa real.
function normalizeError(err) {
  if (err.name === 'ValidationError' && err.errors) {
    const messages = Object.values(err.errors)
      .map((e) => e.message)
      .join('; ');
    return new AppError(messages || 'Datos invalidos', 400);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'campo';
    return new AppError(`Ya existe un registro con el mismo ${field}`, 409);
  }

  if (err.name === 'CastError') {
    return new AppError(`Valor invalido para ${err.path}`, 400);
  }

  return err;
}

export function errorHandler(err, req, res, _next) {
  const error = normalizeError(err);
  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Internal server error';

  if (!error.isOperational) {
    console.error('Unexpected error:', err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}
