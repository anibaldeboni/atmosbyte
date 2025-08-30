# Instalação do Atmosbyte no Raspberry Pi

Este guia explica como instalar e configurar o Atmosbyte para inicializar automaticamente no boot do Raspberry Pi Zero 2W.

## Pré-requisitos

- Raspberry Pi Zero 2W com Raspberry Pi OS
- Acesso SSH ou terminal local
- Usuário com privilégios sudo (não necessariamente `pi`)

## Opções de Instalação

Existem duas formas de instalar o serviço:

1. **Com usuário dedicado (Recomendado)**: Cria um usuário específico `atmosbyte` para executar o serviço
2. **Com usuário atual**: Usa seu usuário atual para executar o serviço

## Instalação Automática (Recomendada)

### 1. Construir o binário para ARM64

No seu computador de desenvolvimento:

```bash
# Construir o binário para Raspberry Pi
make build-rpi

# Ou criar um pacote completo para deployment
make package-rpi
```

### 2. Transferir arquivos para o Raspberry Pi

Copie os seguintes arquivos para o Raspberry Pi:

```bash
# Usando scp (substitua PI_IP pelo IP do seu Raspberry Pi e USERNAME pelo seu usuário)
scp bin/linux-arm64/atmosbyte USERNAME@PI_IP:~/
scp atmosbyte.service USERNAME@PI_IP:~/
scp install-service.sh USERNAME@PI_IP:~/
scp install-service-current-user.sh USERNAME@PI_IP:~/
scp atmosbyte.yaml.example USERNAME@PI_IP:~/atmosbyte.yaml
```

Ou se você criou o pacote:

```bash
scp dist/atmosbyte-rpi-*.tar.gz USERNAME@PI_IP:~/
```

### 3. Instalar no Raspberry Pi

No Raspberry Pi:

```bash
# Se usando o pacote tar.gz
tar -xzf atmosbyte-rpi-*.tar.gz

# Editar a configuração conforme necessário
nano atmosbyte.yaml

# Instalação o serviço
sudo ./install-service.sh
```

**Detalhe da instalação:**

- **Usuário dedicado**: Cria um usuário específico `atmosbyte` para executar o serviço (mais seguro)

**Nota**: O script automaticamente detecta se o serviço atmosbyte já está rodando e o para antes de prosseguir com a instalação.

## Instalação Manual

### 1. Criar diretório de instalação

```bash
sudo mkdir -p /opt/atmosbyte
sudo chown $(whoami):$(whoami) /opt/atmosbyte
```

### 2. Copiar arquivos

```bash
# Copiar binário
sudo cp atmosbyte /opt/atmosbyte/
sudo chmod +x /opt/atmosbyte/atmosbyte

# Copiar configuração
sudo cp atmosbyte.yaml /opt/atmosbyte/
```

### 3. Instalar serviço systemd

```bash
# Copiar arquivo de serviço
sudo cp atmosbyte.service /etc/systemd/system/

# Recarregar systemd
sudo systemctl daemon-reload

# Habilitar e iniciar serviço
sudo systemctl enable atmosbyte
sudo systemctl start atmosbyte
```

## Configuração

### Arquivo de configuração

Edite `/opt/atmosbyte/atmosbyte.yaml` conforme suas necessidades:

```yaml
# Exemplo de configuração básica
sensor:
  type: "hardware"  # ou "simulated" para testes
  
web:
  port: 8080
  
database:
  path: "/opt/atmosbyte/data.db"
  
openweather:
  api_key: "sua_api_key_aqui"
  station_id: "sua_station_id"
```

### Verificar logs GPIO (se usando sensor hardware)

```bash
# Verificar se o usuário tem acesso ao GPIO (substitua USERNAME pelo seu usuário)
sudo usermod -a -G gpio USERNAME

# Habilitar I2C (necessário para BME280)
sudo raspi-config
# Navigate to: Interface Options > I2C > Enable
```

## Comandos Úteis

### Gerenciar o serviço

```bash
# Verificar status
sudo systemctl status atmosbyte

# Ver logs em tempo real
sudo journalctl -u atmosbyte -f

# Reiniciar serviço
sudo systemctl restart atmosbyte

# Parar serviço
sudo systemctl stop atmosbyte

# Desabilitar auto-inicialização
sudo systemctl disable atmosbyte
```

### Logs e diagnóstico

```bash
# Ver logs das últimas 24 horas
sudo journalctl -u atmosbyte --since "24 hours ago"

# Ver logs com mais detalhes
sudo journalctl -u atmosbyte -l --no-pager

# Verificar se o serviço está habilitado para boot
sudo systemctl is-enabled atmosbyte
```

### Atualizar aplicação

```bash
# Parar serviço
sudo systemctl stop atmosbyte

# Substituir binário
sudo cp novo_atmosbyte /opt/atmosbyte/atmosbyte

# Iniciar serviço
sudo systemctl start atmosbyte
```

## Troubleshooting

### Serviço não inicia

1. Verificar logs: `sudo journalctl -u atmosbyte -l`
2. Verificar permissões: `ls -la /opt/atmosbyte/`
3. Testar binário manualmente: `cd /opt/atmosbyte && ./atmosbyte`

### Problemas com sensor BME280

1. Verificar se I2C está habilitado: `sudo raspi-config`
2. Verificar dispositivos I2C: `sudo i2cdetect -y 1`
3. Verificar permissões GPIO: `groups USERNAME` (deve incluir `gpio`)
   - Se usando usuário dedicado: `groups atmosbyte`

### Problemas de permissão

```bash
# Corrigir permissões (substitua USERNAME pelo usuário que executa o serviço)
sudo chown -R USERNAME:USERNAME /opt/atmosbyte
sudo chmod +x /opt/atmosbyte/atmosbyte

# Se usando usuário dedicado
sudo chown -R atmosbyte:atmosbyte /opt/atmosbyte
```

### Desinstalar

```bash
# Usando o Makefile (no diretório do projeto)
make uninstall-service

# Ou manualmente
sudo systemctl stop atmosbyte
sudo systemctl disable atmosbyte
sudo rm /etc/systemd/system/atmosbyte.service
sudo systemctl daemon-reload
sudo rm -rf /opt/atmosbyte
```

## Monitoramento

O serviço será automaticamente:
- Iniciado no boot
- Reiniciado em caso de falha (máximo 3 tentativas em 60 segundos)
- Logado no journal do systemd

Para monitoramento contínuo, você pode usar:

```bash
# Criar um alias útil
echo 'alias atmosbyte-status="sudo systemctl status atmosbyte"' >> ~/.bashrc
echo 'alias atmosbyte-logs="sudo journalctl -u atmosbyte -f"' >> ~/.bashrc
source ~/.bashrc
```
