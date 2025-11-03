CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    password VARCHAR(255),
    dados JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  brand VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  product_condition ENUM('novo','usado') NOT NULL DEFAULT 'novo', -- 👈 renomeado
  sku VARCHAR(100),
  extra JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES dropers(id) ON DELETE CASCADE
);

CREATE TABLE clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  droper_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (droper_id) REFERENCES dropers(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS clients;

CREATE TABLE clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  droper_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  dados JSON, -- aqui vai telefone, endereço, observações, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (droper_id) REFERENCES dropers(id) ON DELETE CASCADE
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  droper_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT DEFAULT 1,
  notes TEXT,
  etiqueta VARCHAR(255),
  nota_fiscal VARCHAR(255),
  status ENUM('pendente', 'processando', 'enviado', 'concluido') DEFAULT 'pendente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (droper_id) REFERENCES dropers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

ALTER TABLE orders
ADD COLUMN items_json JSON NULL AFTER product_id;

ALTER TABLE orders MODIFY COLUMN product_id INT NULL;
ALTER TABLE orders MODIFY COLUMN quantity INT DEFAULT 0;

CREATE TABLE store_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  droper_id INT NOT NULL,
  store_name VARCHAR(255) DEFAULT 'Minha Loja',
  logo_url VARCHAR(255) DEFAULT NULL,
  shipping_mode ENUM('retirada', 'por_item') DEFAULT 'por_item',
  shipping_value DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (droper_id) REFERENCES users(id) ON DELETE CASCADE
);
