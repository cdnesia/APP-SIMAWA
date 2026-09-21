// Envelope response generik dari SERVICE-SIMAWA/SERVICE-PUBLIC - dipakai lintas fitur, dan
// lintas app/ maupun server/ (makanya hidup di folder shared/ bawaan Nuxt 4, bukan app/types/).
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: unknown;
}
