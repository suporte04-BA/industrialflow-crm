import html2pdf from 'html2pdf.js';
import { formatDateBR } from './dates';

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function generateComprovantePDF(comprovante) {
  const element = document.createElement('div');
  element.innerHTML = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
      <div style="text-align: center; border-bottom: 2px solid #FFC107; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="margin: 0; color: #1C1C1C; font-size: 22px;">TransObra - Comprovante de Entrega</h1>
        <p style="margin: 5px 0 0; color: #666; font-size: 12px;">${esc(comprovante.contrato)}</p>
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="color: #1C1C1C; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Dados do Contrato</h3>
        <p style="font-size: 12px; margin: 3px 0;"><strong>Contrato:</strong> ${esc(comprovante.contrato) || '-'}</p>
        <p style="font-size: 12px; margin: 3px 0;"><strong>Data:</strong> ${esc(comprovante.data) || '-'}</p>
        <p style="font-size: 12px; margin: 3px 0;"><strong>Hora:</strong> ${esc(comprovante.hora) || '-'}</p>
        <p style="font-size: 12px; margin: 3px 0;"><strong>Atendente:</strong> ${esc(comprovante.atendente) || '-'}</p>
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="color: #1C1C1C; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Dados do Locatario</h3>
        <p style="font-size: 12px; margin: 3px 0;"><strong>Nome:</strong> ${esc(comprovante.locatario) || '-'}</p>
        <p style="font-size: 12px; margin: 3px 0;"><strong>CPF/CNPJ:</strong> ${esc(comprovante.cpf) || '-'}</p>
        <p style="font-size: 12px; margin: 3px 0;"><strong>RG:</strong> ${esc(comprovante.rg) || '-'}</p>
        <p style="font-size: 12px; margin: 3px 0;"><strong>Telefone:</strong> ${esc(comprovante.fone) || '-'}</p>
        <p style="font-size: 12px; margin: 3px 0;"><strong>Contato:</strong> ${esc(comprovante.contato) || '-'}</p>
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="color: #1C1C1C; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Endereco</h3>
        <p style="font-size: 12px; margin: 3px 0;"><strong>Endereco:</strong> ${esc(comprovante.endereco)}${comprovante.numero ? `, ${esc(comprovante.numero)}` : ''}</p>
        <p style="font-size: 12px; margin: 3px 0;"><strong>Bairro:</strong> ${esc(comprovante.bairro) || '-'}</p>
        <p style="font-size: 12px; margin: 3px 0;"><strong>Cidade:</strong> ${esc(comprovante.cidade)}${comprovante.estado ? `/${esc(comprovante.estado)}` : ''}</p>
        <p style="font-size: 12px; margin: 3px 0;"><strong>CEP:</strong> ${esc(comprovante.cep) || '-'}</p>
      </div>

      ${comprovante.localEntrega ? `
      <div style="margin-bottom: 15px;">
        <h3 style="color: #1C1C1C; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Local de Entrega</h3>
        <p style="font-size: 12px; margin: 3px 0;"><strong>Local:</strong> ${esc(comprovante.localEntrega)}</p>
        <p style="font-size: 12px; margin: 3px 0;"><strong>Telefone:</strong> ${esc(comprovante.telefoneEntrega) || '-'}</p>
      </div>` : ''}

      ${comprovante.itens && comprovante.itens.length > 0 ? `
      <div style="margin-bottom: 15px;">
        <h3 style="color: #1C1C1C; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Itens Locados</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Qtde</th>
              <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Descricao</th>
              <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Patrim.</th>
              <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">D.LOC</th>
              <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">D.DEV</th>
              <th style="padding: 6px; text-align: right; border: 1px solid #ddd;">Valor Unit.</th>
              <th style="padding: 6px; text-align: right; border: 1px solid #ddd;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${comprovante.itens.map(item => `
            <tr>
              <td style="padding: 6px; border: 1px solid #ddd;">${esc(item.quantidade) || 1}</td>
              <td style="padding: 6px; border: 1px solid #ddd;">${esc(item.descricao) || '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd;">${esc(item.patrimonio) || '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd;">${esc(item.dataLocacao) || '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd;">${esc(item.dataDevolucao) || '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">R$ ${(item.valorUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">R$ ${((item.quantidade || 1) * (item.valorUnitario || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}

      ${comprovante.observacao ? `
      <div style="margin-bottom: 15px;">
        <h3 style="color: #1C1C1C; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Observacoes</h3>
        <p style="font-size: 12px; margin: 3px 0;">${esc(comprovante.observacao)}</p>
      </div>` : ''}

      <div style="text-align: right; border-top: 2px solid #FFC107; padding-top: 10px; margin-top: 15px;">
        <p style="font-size: 18px; font-weight: bold; color: #1C1C1C;">Total: R$ ${(comprovante.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>

      ${comprovante.assinado ? `
      <div style="margin-top: 30px; text-align: center; color: #16a34a; font-size: 12px;">
        <p style="font-weight: bold;">ASSINADO DIGITALMENTE</p>
        <p>${comprovante.nomeSignatario ? `Por: ${esc(comprovante.nomeSignatario)}` : ''} ${comprovante.dataAssinatura ? `em ${formatDateBR(comprovante.dataAssinatura)}` : ''}</p>
      </div>` : ''}

      <div style="margin-top: 40px; display: flex; justify-content: space-between;">
        <div style="text-align: center; width: 45%;">
          <div style="border-top: 1px solid #333; margin-top: 50px; padding-top: 5px;">
            <p style="font-size: 11px; color: #666;">Responsavel pela Entrega</p>
          </div>
        </div>
        <div style="text-align: center; width: 45%;">
          <div style="border-top: 1px solid #333; margin-top: 50px; padding-top: 5px;">
            <p style="font-size: 11px; color: #666;">Recebedor</p>
          </div>
        </div>
      </div>
    </div>
  `;

  await html2pdf()
    .set({
      margin: 10,
      filename: `comprovante-${comprovante.contrato || 'doc'}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(element)
    .save();
}

export async function generateContratoPDF(contrato) {
  const element = document.createElement('div');
  element.innerHTML = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
      <div style="text-align: center; border-bottom: 2px solid #FFC107; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="margin: 0; color: #1C1C1C; font-size: 22px;">TransObra - Contrato de Locacao</h1>
        <p style="margin: 5px 0 0; color: #666; font-size: 14px; font-weight: bold;">${esc(contrato.id)}</p>
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="color: #1C1C1C; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Dados do Contratante</h3>
        <p style="font-size: 12px; margin: 3px 0;"><strong>Cliente:</strong> ${esc(contrato.cliente) || '-'}</p>
        <p style="font-size: 12px; margin: 3px 0;"><strong>CNPJ:</strong> ${esc(contrato.cnpj) || '-'}</p>
        ${contrato.contato ? `<p style="font-size: 12px; margin: 3px 0;"><strong>Contato:</strong> ${esc(contrato.contato)}</p>` : ''}
        ${contrato.telefone ? `<p style="font-size: 12px; margin: 3px 0;"><strong>Telefone:</strong> ${esc(contrato.telefone)}</p>` : ''}
        ${contrato.email ? `<p style="font-size: 12px; margin: 3px 0;"><strong>Email:</strong> ${esc(contrato.email)}</p>` : ''}
      </div>

      ${contrato.endereco ? `
      <div style="margin-bottom: 15px;">
        <h3 style="color: #1C1C1C; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Endereco</h3>
        <p style="font-size: 12px; margin: 3px 0;">${esc(contrato.endereco)}${contrato.numero ? `, ${esc(contrato.numero)}` : ''}</p>
        <p style="font-size: 12px; margin: 3px 0;">${contrato.bairro ? `${esc(contrato.bairro)} - ` : ''}${esc(contrato.cidade)}${contrato.estado ? `/${esc(contrato.estado)}` : ''}</p>
        ${contrato.cep ? `<p style="font-size: 12px; margin: 3px 0;">CEP: ${esc(contrato.cep)}</p>` : ''}
      </div>` : ''}

      <div style="margin-bottom: 15px;">
        <h3 style="color: #1C1C1C; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Equipamentos</h3>
        ${Array.isArray(contrato.equipamentos) && contrato.equipamentos.length > 0
          ? contrato.equipamentos.map((eq, i) => `<p style="font-size: 12px; margin: 3px 0;">${i + 1}. ${esc(eq)}</p>`).join('')
          : '<p style="font-size: 12px; margin: 3px 0;">Nenhum equipamento informado</p>'
        }
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="color: #1C1C1C; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Valores e Vigencia</h3>
        <p style="font-size: 12px; margin: 3px 0;"><strong>Inicio:</strong> ${contrato.inicio || '-'}</p>
        <p style="font-size: 12px; margin: 3px 0;"><strong>Fim:</strong> ${contrato.fim || '-'}</p>
        <p style="font-size: 12px; margin: 3px 0;"><strong>Valor Mensal:</strong> R$ ${Number(contrato.valorMensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        <p style="font-size: 14px; margin: 5px 0;"><strong>Valor Total:</strong> R$ ${Number(contrato.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">Status: ${contrato.status === 'ativo' ? 'ATIVO' : contrato.status === 'assinado' ? 'ASSINADO' : contrato.status?.toUpperCase() || '-'}</p>
        ${contrato.assinado ? '<p style="font-size: 12px; color: #16a34a; font-weight: bold;">CONTRATO ASSINADO</p>' : ''}
      </div>

      <div style="margin-top: 50px; display: flex; justify-content: space-between;">
        <div style="text-align: center; width: 45%;">
          <div style="border-top: 1px solid #333; margin-top: 50px; padding-top: 5px;">
            <p style="font-size: 11px; color: #666;">TransObra Locacao</p>
          </div>
        </div>
        <div style="text-align: center; width: 45%;">
          <div style="border-top: 1px solid #333; margin-top: 50px; padding-top: 5px;">
            <p style="font-size: 11px; color: #666;">Contratante</p>
          </div>
        </div>
      </div>
    </div>
  `;

  await html2pdf()
    .set({
      margin: 10,
      filename: `contrato-${contrato.id || 'doc'}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(element)
    .save();
}
