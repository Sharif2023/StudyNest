FROM php:8.2-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev libcurl4-openssl-dev \
    && docker-php-ext-install curl pdo_pgsql pgsql \
    && a2enmod headers rewrite \
    && rm -rf /var/lib/apt/lists/*

RUN { \
      echo "upload_max_filesize=64M"; \
      echo "post_max_size=64M"; \
      echo "max_execution_time=300"; \
      echo "max_input_time=300"; \
      echo "memory_limit=512M"; \
    } > /usr/local/etc/php/conf.d/studynest.ini

WORKDIR /var/www/html
COPY . /var/www/html/api/

RUN mkdir -p /var/www/html/api/uploads /var/www/html/api/proofs /var/www/html/api/group_uploads \
    && chown -R www-data:www-data /var/www/html/api

EXPOSE 80
