# TESTE GAS - Rode amanha depois que a quota resetar (~10h da manha)
# Verifica se Google Apps Script voltou a enviar emails

$body = @{
    tipo = "contrato_assinado"
    destinatario = "suporte04@baeletrica.com.br"
    contrato = @{
        numero = "TESTE-QUOTA-001"
        cliente = "Teste Quota Resetada"
        cnpj = "12.345.678/0001-90"
        telefone = "(92) 99386-7171"
        equipamentos = @("ROCADEIRA GASOLINA 4 TEMPOS")
        inicio = "2026-07-10"
        fim = "2026-07-17"
        valorMensal = 110
        valorTotal = 110
        atendente = "TESTE AUTOMATICO"
        localEntrega = "RUA TESTE, 123 - CENTRO"
        endereco = "RUA TESTE"
        numero_endereco = "123"
        bairro = "CENTRO"
        cidade = "MANAUS"
        estado = "AM"
        cep = "69000-000"
        contato = "Teste Quota"
    }
    comprovante = @{
        contrato = "CT-TESTE"
        locatario = "Teste Quota Resetada"
        cpf = "123.456.789-00"
        endereco = "RUA TESTE, 123"
        total = 110
        itens = @()
    }
    signatario = @{
        nome = "Teste Quota"
        cpf = "123.456.789-00"
        data = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        assinaturaImagem = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsM EBcQERMRCwsMEBgPEhMSFBITExIYFRYYHB4fHhT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k="
    }
} | ConvertTo-Json -Depth 5

Write-Host "Enviando teste GAS via Worker..." -ForegroundColor Yellow
$r = Invoke-RestMethod -Uri "https://transobras.suporte04.workers.dev/api/email/send" -Method POST -ContentType "application/json" -Body $body

Write-Host ""
Write-Host "Resultado:" -ForegroundColor Cyan
$r | ConvertTo-Json -Depth 3

if ($r.success) {
    Write-Host ""
    Write-Host "EMAIL ENVIADO COM SUCESSO VIA GAS!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "FALHA - Verifique os logs do GAS" -ForegroundColor Red
}
