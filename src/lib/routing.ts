const baseUrl = import.meta.env.BASE_URL || '/';

export const normalizeBasePath = () => {
  if (baseUrl === './') {
    return '/';
  }

  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
};

export const dataPath = (relativePath: string) =>
  `${normalizeBasePath()}${relativePath.replace(/^\/+/, '')}`;
