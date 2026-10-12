import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Modal,
  TextInput
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState('escalas');
  const [membros, setMembros] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Escala Mensal
  const dataHoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(dataHoje.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(dataHoje.getFullYear());
  const [modalMesVisivel, setModalMesVisivel] = useState(false);
  const [diasCulto, setDiasCulto] = useState({ sabados: [], domingos: [], quartas: [] });
  const [dadosEscala, setDadosEscala] = useState({});

  // Modal Seletor Híbrido
  const [modalSeletorVisivel, setModalSeletorVisivel] = useState(false);
  const [seletorChave, setSeletorChave] = useState('');
  const [seletorTitulo, setSeletorTitulo] = useState('');
  const [seletorBusca, setSeletorBusca] = useState('');
  const [apenasHomens, setApenasHomens] = useState(false);
  const [apenasMulheres, setApenasMulheres] = useState(false);

  // Modal Escala Digitada
  const [modalDigitadoVisivel, setModalDigitadoVisivel] = useState(false);

  // Gestão de Membros
  const [modalIndividualVisivel, setModalIndividualVisivel] = useState(false);
  const [modalLoteVisivel, setModalLoteVisivel] = useState(false);
  const [modalEdicaoVisivel, setModalEdicaoVisivel] = useState(false);

  const [novoNome, setNovoNome] = useState('');
  const [novoCargo, setNovoCargo] = useState('Diácono');
  const [novoTelefone, setNovoTelefone] = useState('');

  const [membroEditandoId, setMembroEditandoId] = useState(null);
  const [editaNome, setEditaNome] = useState('');
  const [editaCargo, setEditaCargo] = useState('Diácono');
  const [editaTelefone, setEditaTelefone] = useState('');

  const [cargoLote, setCargoLote] = useState('Diácono');
  const [textoLote, setTextoLote] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    calcularDiasDoMes(mesSelecionado, anoSelecionado);
  }, [mesSelecionado, anoSelecionado]);

  async function carregarDados() {
    try {
      setCarregando(true);
      const { data: dadosMembros, error: errM } = await supabase
        .from('membros')
        .select('*')
        .order('nome');
      if (errM) throw errM;

      const { data: dadosTemplates, error: errT } = await supabase
        .from('templates_lembretes')
        .select('*');
      if (errT) throw errT;

      setMembros(dadosMembros || []);
      setTemplates(dadosTemplates || []);
    } catch (err) {
      Alert.alert('Erro ao carregar', err.message);
    } finally {
      setCarregando(false);
    }
  }

  function calcularDiasDoMes(mes, ano) {
    const sabados = [];
    const domingos = [];
    const quartas = [];
    const totalDias = new Date(ano, mes, 0).getDate();

    for (let dia = 1; dia <= totalDias; dia++) {
      const d = new Date(ano, mes - 1, dia);
      const diaSemana = d.getDay();
      const isoData = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const rotulo = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`;

      if (diaSemana === 6) sabados.push({ data: isoData, rotulo });
      if (diaSemana === 0) domingos.push({ data: isoData, rotulo });
      if (diaSemana === 3) quartas.push({ data: isoData, rotulo });
    }

    setDiasCulto({ sabados, domingos, quartas });
    carregarEscalaDoMes(mes, ano);
  }

  async function carregarEscalaDoMes(mes, ano) {
    try {
      const primeiroDia = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const ultimoDia = `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`;

      const { data, error } = await supabase
        .from('escalas')
        .select('*')
        .gte('data_culto', primeiroDia)
        .lte('data_culto', ultimoDia);

      if (error) throw error;

      const mapa = {};
      (data || []).forEach(reg => {
        const dt = reg.data_culto;
        if (reg.abertura_nome) mapa[`${dt}_abrir`] = reg.abertura_nome;
        (reg.recolhimento_nomes || []).forEach((nome, idx) => {
          mapa[`${dt}_recolher_${idx}`] = nome;
        });
        (reg.cobertura_nomes || []).forEach((nome, idx) => {
          mapa[`${dt}_cobrir_${idx}`] = nome;
        });
        (reg.saida_nomes || []).forEach((nome, idx) => {
          mapa[`${dt}_saida_${idx}`] = nome;
        });
      });
      setDadosEscala(mapa);
    } catch {
      // Ignora erro inicial
    }
  }

  function abrirModalSelecao(chave, titulo, filtro = null) {
    setSeletorChave(chave);
    setSeletorTitulo(titulo);
    setSeletorBusca(dadosEscala[chave] || '');
    setApenasMulheres(filtro === 'mulheres');
    setApenasHomens(filtro === 'homens');
    setModalSeletorVisivel(true);
  }

  function confirmarSelecao(nome) {
    setDadosEscala(prev => ({ ...prev, [seletorChave]: nome }));
    setModalSeletorVisivel(false);
  }

  async function salvarEscalaBanco() {
    try {
      setCarregando(true);
      const todosDias = [...diasCulto.sabados, ...diasCulto.domingos, ...diasCulto.quartas];
      const datasArray = todosDias.map(d => d.data);

      if (datasArray.length > 0) {
        await supabase.from('escalas').delete().in('data_culto', datasArray);
      }

      const registros = [];

      todosDias.forEach(d => {
        const dt = d.data;
        const diaObj = new Date(dt + 'T12:00:00');
        const diaSemanaNum = diaObj.getDay();
        let dia_semana = 'sabado';
        if (diaSemanaNum === 0) dia_semana = 'domingo';
        if (diaSemanaNum === 3) dia_semana = 'quarta';

        const abertura_nome = dadosEscala[`${dt}_abrir`] || null;
        const recolhimento_nomes = [
          dadosEscala[`${dt}_recolher_0`],
          dadosEscala[`${dt}_recolher_1`],
          dadosEscala[`${dt}_recolher_2`],
          dadosEscala[`${dt}_recolher_3`]
        ].filter(Boolean);

        const cobertura_nomes = [
          dadosEscala[`${dt}_cobrir_0`],
          dadosEscala[`${dt}_cobrir_1`]
        ].filter(Boolean);

        const saida_nomes = [
          dadosEscala[`${dt}_saida_0`],
          dadosEscala[`${dt}_saida_1`]
        ].filter(Boolean);

        if (abertura_nome || recolhimento_nomes.length > 0 || cobertura_nomes.length > 0 || saida_nomes.length > 0) {
          registros.push({
            data_culto: dt,
            dia_semana,
            abertura_nome,
            recolhimento_nomes,
            cobertura_nomes,
            saida_nomes
          });
        }
      });

      if (registros.length > 0) {
        const { error } = await supabase.from('escalas').insert(registros);
        if (error) throw error;
      }

      Alert.alert('Sucesso', 'Escala guardada com sucesso!');
    } catch (err) {
      Alert.alert('Erro ao guardar', err.message);
    } finally {
      setCarregando(false);
    }
  }

  // Gera texto completo da escala digitada
  function gerarTextoEscalaDigitada() {
    const mesNome = MESES[mesSelecionado - 1].toUpperCase();
    let texto = `*ESCALA DE DIACONATO - ${mesNome} / ${anoSelecionado}*\n\n`;

    if (diasCulto.sabados.length > 0) {
      texto += `=====================\n`;
      texto += `🟦 *SÁBADOS*\n`;
      texto += `=====================\n`;
      diasCulto.sabados.forEach(d => {
        const abertura = dadosEscala[`${d.data}_abrir`] || '—';
        const recolh = [0, 1, 2, 3].map(i => dadosEscala[`${d.data}_recolher_${i}`]).filter(Boolean).join(', ') || '—';
        const cobrir = [0, 1].map(i => dadosEscala[`${d.data}_cobrir_${i}`]).filter(Boolean).join(', ') || '—';
        const saida = [0, 1].map(i => dadosEscala[`${d.data}_saida_${i}`]).filter(Boolean).join(', ') || '—';

        texto += `📅 *${d.rotulo}*\n`;
        texto += `• Abrir Igreja: ${abertura}\n`;
        texto += `• Recolhimento: ${recolh}\n`;
        texto += `• Cobrir Salva: ${cobrir}\n`;
        texto += `• Ordenação de Saída: ${saida}\n\n`;
      });
    }

    if (diasCulto.domingos.length > 0) {
      texto += `=====================\n`;
      texto += `🟩 *DOMINGOS*\n`;
      texto += `=====================\n`;
      diasCulto.domingos.forEach(d => {
        const abertura = dadosEscala[`${d.data}_abrir`] || '—';
        const recolh = [0, 1].map(i => dadosEscala[`${d.data}_recolher_${i}`]).filter(Boolean).join(', ') || '—';

        texto += `📅 *${d.rotulo}*\n`;
        texto += `• Abrir Igreja: ${abertura}\n`;
        texto += `• Recolhimento: ${recolh}\n\n`;
      });
    }

    if (diasCulto.quartas.length > 0) {
      texto += `=====================\n`;
      texto += `🟨 *QUARTAS-FEIRAS*\n`;
      texto += `=====================\n`;
      diasCulto.quartas.forEach(d => {
        const abertura = dadosEscala[`${d.data}_abrir`] || '—';
        const recolh = [0, 1].map(i => dadosEscala[`${d.data}_recolher_${i}`]).filter(Boolean).join(', ') || '—';

        texto += `📅 *${d.rotulo}*\n`;
        texto += `• Abrir Igreja: ${abertura}\n`;
        texto += `• Recolhimento: ${recolh}\n\n`;
      });
    }

    return texto;
  }

  async function copiarEscalaDigitada() {
    const texto = gerarTextoEscalaDigitada();
    await Clipboard.setStringAsync(texto);
    Alert.alert('Copiado com Sucesso', 'Escala digitada do mês copiada para o WhatsApp!');
  }

  async function copiarLembrete(template) {
    let corpoFinal = template.corpo;
    let dataRef = '';

    // Data de hoje no formato YYYY-MM-DD
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const diaAtual = String(hoje.getDate()).padStart(2, '0');
    const isoHoje = `${anoAtual}-${mesAtual}-${diaAtual}`;

    // Função auxiliar para pegar o culto de hoje ou o próximo a acontecer
    const obterProximoCulto = (lista) => {
      if (!lista || lista.length === 0) return '';
      const futuroOuHoje = lista.find(d => d.data >= isoHoje);
      return futuroOuHoje ? futuroOuHoje.data : lista[lista.length - 1].data;
    };

    if (template.id === 'sabado') dataRef = obterProximoCulto(diasCulto.sabados);
    if (template.id === 'domingo') dataRef = obterProximoCulto(diasCulto.domingos);
    if (template.id === 'quarta') dataRef = obterProximoCulto(diasCulto.quartas);

    const abertura = dadosEscala[`${dataRef}_abrir`] || 'A definir';
    const recolh = [
      dadosEscala[`${dataRef}_recolher_0`],
      dadosEscala[`${dataRef}_recolher_1`],
      dadosEscala[`${dataRef}_recolher_2`],
      dadosEscala[`${dataRef}_recolher_3`]
    ].filter(Boolean).map(n => `• ${n}`).join('\n') || 'A definir';

    const cobrir = [
      dadosEscala[`${dataRef}_cobrir_0`],
      dadosEscala[`${dataRef}_cobrir_1`]
    ].filter(Boolean).map(n => `• ${n}`).join('\n') || 'A definir';

    const saida = [
      dadosEscala[`${dataRef}_saida_0`],
      dadosEscala[`${dataRef}_saida_1`]
    ].filter(Boolean).map(n => `• ${n}`).join('\n') || 'Conforme alinhamento';

    const diaObj = diasCulto.sabados.find(d => d.data === dataRef)
                || diasCulto.domingos.find(d => d.data === dataRef)
                || diasCulto.quartas.find(d => d.data === dataRef);

    corpoFinal = corpoFinal
      .replace('{DATA}', diaObj ? diaObj.rotulo : '')
      .replace('{ABERTURA}', abertura)
      .replace('{RECOLHIMENTO}', recolh)
      .replace('{COBERTURA}', cobrir)
      .replace('{SAIDA}', saida);

    await Clipboard.setStringAsync(corpoFinal);
    Alert.alert('Copiado', `Mensagem do ${template.titulo} pronta para enviar.`);
  }

  async function carregarBase64(modulo) {
    try {
      const asset = Asset.fromModule(modulo);
      await asset.downloadAsync();
      return await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      return null;
    }
  }
async function gerarPdfEscalaOficial() {
    try {
      setCarregando(true);

      const topoB64 = await carregarBase64(require('./assets/topo.jpeg'));
      const rodapeB64 = await carregarBase64(require('./assets/rodape.jpeg'));

      const mesNome = MESES[mesSelecionado - 1];
      const anoNome = anoSelecionado;

      const qtdSab = diasCulto.sabados.length;
      const qtdDom = diasCulto.domingos.length;
      const qtdQua = diasCulto.quartas.length;

      // Regra exata do seu pdf.blade.php
      const modoCompacto = (qtdSab >= 5 && qtdQua >= 5) || (qtdSab + qtdDom + qtdQua >= 14);

      const htmlContent = `
        <!doctype html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=794, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>Escala do Diaconato</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html {
              margin: 0;
              padding: 0;
              width: 794px;
            }
            body {
              margin: 0;
              padding: 0;
              width: 794px;
              min-height: 1120px;
              font-family: Arial, Helvetica, sans-serif;
              color: #1b1b1b;
              padding-top: 122px;
              padding-bottom: 110px;
              padding-left: 32px;
              padding-right: 32px;
              background-color: #ffffff;
            }

            .header, .footer {
              position: fixed;
              left: 0;
              width: 100%;
              z-index: 100;
            }
            .header { top: 0; height: 110px; }
            .footer { bottom: 0; height: 90px; }

            .header img, .footer img {
              width: 100%;
              height: 100%;
              display: block;
              object-fit: cover;
            }

            .title {
              text-align: center;
              margin: 0 0 12px 0;
            }
            .title h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 900;
              text-transform: uppercase;
              color: #1f3a57;
              letter-spacing: .6px;
            }
            .title h2 {
              margin: 5px 0 0 0;
              font-size: 23px;
              font-weight: 900;
              color: #42576b;
              text-transform: capitalize;
            }

            .sec-title {
              font-size: 19px;
              font-weight: 700;
              letter-spacing: .5px;
              text-transform: uppercase;
              text-align: center;
              color: #ffffff;
              padding: 7px 0;
              background: #0b4f7b;
              border-radius: 4px;
              margin: 12px 0 8px 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              margin-bottom: 10px;
            }
            th, td {
              border: 1px solid #8fb7c4;
              padding: 7px 6px;
              vertical-align: middle;
            }
            th {
              background: #e9f4f7;
              color: #1f3a57;
              font-size: 12px;
              font-weight: 900;
              text-transform: uppercase;
              text-align: center;
            }
            td {
              font-size: 14px;
              text-align: center;
              font-weight: 600;
            }

            .dia { width: 12%; font-weight: 900; }
            .abrir { width: 16%; font-weight: 900; }
            .cobrir { width: 18%; }
            .slot4 { width: 13.5%; }
            .slot2 { width: 36%; }

            .multiline {
              text-align: center;
              line-height: 1.15;
            }
            .multiline div { margin: 0 0 1px 0; }
            .muted { color: #6b7785; }

            /* Modo compacto idêntico ao Blade quando o mês é cheio */
            ${modoCompacto ? `
              body {
                padding-top: 114px;
                padding-bottom: 98px;
              }
              .title h1 { font-size: 21px; }
              .title h2 { font-size: 20px; }
              .sec-title {
                font-size: 16px;
                padding: 6px 0;
                margin: 8px 0 5px 0;
              }
              table { margin-bottom: 6px; }
              th, td { padding: 5.5px 4px; }
              th { font-size: 11px; }
              td { font-size: 12.5px; }
            ` : ''}
          </style>
        </head>
        <body class="${modoCompacto ? 'compacto' : ''}">
          <div class="header">
            ${topoB64 ? `<img src="data:image/jpeg;base64,${topoB64}" alt="Topo" />` : ''}
          </div>

          <div class="footer">
            ${rodapeB64 ? `<img src="data:image/jpeg;base64,${rodapeB64}" alt="Rodapé" />` : ''}
          </div>

          <div class="title">
            <h1>ESCALA DE DIACONATO</h1>
            <h2>${mesNome} de ${anoNome}</h2>
          </div>

          ${diasCulto.sabados.length > 0 ? `
            <div class="sec-title">SÁBADOS</div>
            <table>
              <thead>
                <tr>
                  <th class="dia">DIA</th>
                  <th colspan="4">DIÁCONOS E DIACONIZAS RECOLHIMENTO DÍZIMOS E OFERTAS</th>
                  <th class="cobrir">COBRIR A SALVA</th>
                  <th class="abrir">RESP. ABRIR IGREJA</th>
                </tr>
              </thead>
              <tbody>
                ${diasCulto.sabados.map(d => `
                  <tr>
                    <td class="dia">${d.rotulo}</td>
                    <td class="slot4">${dadosEscala[`${d.data}_recolher_0`] || ''}</td>
                    <td class="slot4">${dadosEscala[`${d.data}_recolher_1`] || ''}</td>
                    <td class="slot4">${dadosEscala[`${d.data}_recolher_2`] || ''}</td>
                    <td class="slot4">${dadosEscala[`${d.data}_recolher_3`] || ''}</td>
                    <td class="cobrir">
                      <div class="multiline">
                        <div>${dadosEscala[`${d.data}_cobrir_0`] || '<span class="muted">—</span>'}</div>
                        <div>${dadosEscala[`${d.data}_cobrir_1`] || ''}</div>
                      </div>
                    </td>
                    <td class="abrir">
                      <div class="multiline">
                        <div>${dadosEscala[`${d.data}_abrir`] || '<span class="muted">—</span>'}</div>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          ${diasCulto.domingos.length > 0 ? `
            <div class="sec-title">DOMINGOS</div>
            <table>
              <thead>
                <tr>
                  <th class="dia">DIA</th>
                  <th colspan="2">RECOLHIMENTO DÍZIMOS E OFERTAS</th>
                  <th class="abrir">RESP. ABRIR IGREJA</th>
                </tr>
              </thead>
              <tbody>
                ${diasCulto.domingos.map(d => `
                  <tr>
                    <td class="dia">${d.rotulo}</td>
                    <td class="slot2">${dadosEscala[`${d.data}_recolher_0`] || ''}</td>
                    <td class="slot2">${dadosEscala[`${d.data}_recolher_1`] || ''}</td>
                    <td class="abrir">
                      <div class="multiline">
                        <div>${dadosEscala[`${d.data}_abrir`] || '<span class="muted">—</span>'}</div>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          ${diasCulto.quartas.length > 0 ? `
            <div class="sec-title">QUARTAS-FEIRAS</div>
            <table>
              <thead>
                <tr>
                  <th class="dia">DIA</th>
                  <th colspan="2">RECOLHIMENTO DÍZIMOS E OFERTAS</th>
                  <th class="abrir">RESP. ABRIR IGREJA</th>
                </tr>
              </thead>
              <tbody>
                ${diasCulto.quartas.map(d => `
                  <tr>
                    <td class="dia">${d.rotulo}</td>
                    <td class="slot2">${dadosEscala[`${d.data}_recolher_0`] || ''}</td>
                    <td class="slot2">${dadosEscala[`${d.data}_recolher_1`] || ''}</td>
                    <td class="abrir">
                      <div class="multiline">
                        <div>${dadosEscala[`${d.data}_abrir`] || '<span class="muted">—</span>'}</div>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
        </body>
        </html>
      `;

      await Print.printAsync({ html: htmlContent });
    } catch (err) {
      Alert.alert('Erro ao gerar PDF', err.message);
    } finally {
      setCarregando(false);
    }
  }

  
  function obterListaMembrosFiltrada() {
    let lista = membros.filter(m => m.ativo);
    if (apenasMulheres) {
      lista = lista.filter(m => (m.cargo || m.tipo || '').toLowerCase().includes('diaconisa'));
    }
    if (apenasHomens) {
      lista = lista.filter(m => (m.cargo || m.tipo || '').toLowerCase().includes('diácono') || (m.cargo || m.tipo || '').toLowerCase().includes('diacono'));
    }
    if (seletorBusca.trim()) {
      lista = lista.filter(m => m.nome.toUpperCase().includes(seletorBusca.trim().toUpperCase()));
    }
    return lista;
  }


  // Ações da Equipe
  async function cadastrarIndividual() {
    const nomeLimpo = novoNome.trim().toUpperCase();
    if (!nomeLimpo) {
      Alert.alert('Atenção', 'Informe o nome do oficial.');
      return;
    }

    try {
      const tipoValor = novoCargo === 'Diaconisa' ? 'diaconisa' : 'diacono';
      const { error } = await supabase.from('membros').insert([{
        nome: nomeLimpo,
        cargo: novoCargo,
        tipo: tipoValor,
        telefone: novoTelefone.trim() || null,
        ativo: true
      }]);

      if (error) throw error;

      setNovoNome('');
      setNovoTelefone('');
      setModalIndividualVisivel(false);
      await carregarDados();
      Alert.alert('Sucesso', 'Membro cadastrado com sucesso!');
    } catch (err) {
      Alert.alert('Erro ao salvar', err.message);
    }
  }

  async function cadastrarLote() {
    if (!textoLote.trim()) {
      Alert.alert('Atenção', 'Cole a lista de nomes.');
      return;
    }

    const nomes = textoLote
      .split(/[\n,]+/)
      .map(n => n.trim().toUpperCase())
      .filter(n => n.length > 1);

    if (nomes.length === 0) {
      Alert.alert('Aviso', 'Nenhum nome válido encontrado.');
      return;
    }

    const tipoValor = cargoLote === 'Diaconisa' ? 'diaconisa' : 'diacono';
    const payload = nomes.map(nome => ({
      nome,
      cargo: cargoLote,
      tipo: tipoValor,
      ativo: true
    }));

    try {
      const { error } = await supabase
        .from('membros')
        .upsert(payload, { onConflict: 'nome', ignoreDuplicates: true });

      if (error) throw error;

      setTextoLote('');
      setModalLoteVisivel(false);
      await carregarDados();
      Alert.alert('Sucesso', `${nomes.length} membros cadastrados!`);
    } catch (err) {
      Alert.alert('Erro no lote', err.message);
    }
  }

  async function salvarEdicao() {
    if (!editaNome.trim()) return;
    try {
      const tipoValor = editaCargo === 'Diaconisa' ? 'diaconisa' : 'diacono';
      await supabase.from('membros').update({
        nome: editaNome.trim().toUpperCase(),
        cargo: editaCargo,
        tipo: tipoValor,
        telefone: editaTelefone.trim() || null
      }).eq('id', membroEditandoId);

      setModalEdicaoVisivel(false);
      await carregarDados();
    } catch (err) {
      Alert.alert('Erro', err.message);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b4f7b" />

      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Diaconato - IASD Várzea</Text>
        <Text style={styles.headerSub}>Gestão Mensal e Escalas</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, abaAtiva === 'escalas' && styles.tabItemAtivo]}
          onPress={() => setAbaAtiva('escalas')}
        >
          <Text style={[styles.tabTexto, abaAtiva === 'escalas' && styles.tabTextoAtivo]}>📅 Escalas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, abaAtiva === 'lembretes' && styles.tabItemAtivo]}
          onPress={() => setAbaAtiva('lembretes')}
        >
          <Text style={[styles.tabTexto, abaAtiva === 'lembretes' && styles.tabTextoAtivo]}>💬 Lembretes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, abaAtiva === 'equipe' && styles.tabItemAtivo]}
          onPress={() => setAbaAtiva('equipe')}
        >
          <Text style={[styles.tabTexto, abaAtiva === 'equipe' && styles.tabTextoAtivo]}>
            👥 Equipe ({membros.length})
          </Text>
        </TouchableOpacity>
      </View>

      {carregando ? (
        <View style={styles.centralizado}>
          <ActivityIndicator size="large" color="#0b4f7b" />
          <Text style={styles.textoCarregando}>A carregar dados...</Text>
        </View>
      ) : (
        <View style={styles.conteudo}>
          {/* ================= ABA ESCALAS ================= */}
          {abaAtiva === 'escalas' && (
            <ScrollView contentContainerStyle={styles.scrollPadrao}>
              <View style={styles.cardFiltro}>
                <Text style={styles.secaoTitulo}>Mês da Escala</Text>
                <View style={styles.linhaFiltros}>
                  <View style={{ flex: 1.4 }}>
                    <Text style={styles.labelFiltro}>Mês:</Text>
                    <TouchableOpacity
                      style={styles.campoSelecaoMes}
                      onPress={() => setModalMesVisivel(true)}
                    >
                      <Text style={styles.textoSelecaoMes}>{MESES[mesSelecionado - 1]}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.labelFiltro}>Ano:</Text>
                    <TextInput
                      style={styles.inputAno}
                      value={String(anoSelecionado)}
                      onChangeText={t => setAnoSelecionado(parseInt(t, 10) || 2026)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.linhaBotoesAcao}>
                  <TouchableOpacity style={styles.btnSalvar} onPress={salvarEscalaBanco}>
                    <Text style={styles.btnTextoBranco}>💾 Guardar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnPdf} onPress={gerarPdfEscalaOficial}>
                    <Text style={styles.btnTextoBranco}>📄 Gerar PDF</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* SÁBADOS */}
              <View style={styles.blocoCulto}>
                <Text style={styles.tituloSecao}>🟦 SÁBADOS ({diasCulto.sabados.length})</Text>
                {diasCulto.sabados.map(dia => (
                  <View key={dia.data} style={styles.cardDia}>
                    <Text style={styles.dataTitulo}>Sábado - {dia.rotulo}</Text>

                    {/* ABRIR IGREJA */}
                    <Text style={styles.labelFuncao}>Abrir Igreja (Diácono):</Text>
                    <TouchableOpacity
                      style={styles.caixaSelecao}
                      onPress={() => abrirModalSelecao(`${dia.data}_abrir`, `Abrir Igreja (${dia.rotulo})`, 'homens')}
                    >
                      <Text style={[styles.textoSelecao, !dadosEscala[`${dia.data}_abrir`] && styles.placeholder]}>
                        {dadosEscala[`${dia.data}_abrir`] || 'Selecionar diácono responsável'}
                      </Text>
                    </TouchableOpacity>

                    {/* RECOLHIMENTO */}
                    <Text style={styles.labelFuncao}>Recolhimento (4 vagas):</Text>
                    {[0, 1, 2, 3].map(pos => (
                      <TouchableOpacity
                        key={pos}
                        style={styles.caixaSelecao}
                        onPress={() => abrirModalSelecao(`${dia.data}_recolher_${pos}`, `Recolhimento ${pos + 1} (${dia.rotulo})`)}
                      >
                        <Text style={[styles.textoSelecao, !dadosEscala[`${dia.data}_recolher_${pos}`] && styles.placeholder]}>
                          {dadosEscala[`${dia.data}_recolher_${pos}`] || `Recolhimento ${pos + 1}`}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {/* COBRIR SALVA */}
                    <Text style={styles.labelFuncao}>Cobrir a Salva (2 Diaconisas):</Text>
                    {[0, 1].map(pos => (
                      <TouchableOpacity
                        key={pos}
                        style={styles.caixaSelecao}
                        onPress={() => abrirModalSelecao(`${dia.data}_cobrir_${pos}`, `Cobrir Salva ${pos + 1} (${dia.rotulo})`, 'mulheres')}
                      >
                        <Text style={[styles.textoSelecao, !dadosEscala[`${dia.data}_cobrir_${pos}`] && styles.placeholder]}>
                          {dadosEscala[`${dia.data}_cobrir_${pos}`] || `Cobrir Salva ${pos + 1}`}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {/* ORDENAÇÃO DE SAÍDA */}
                    <Text style={styles.labelFuncao}>🚶‍♂️ Ordenação de Saída (2 Diáconos):</Text>
                    {[0, 1].map(pos => (
                      <TouchableOpacity
                        key={pos}
                        style={[styles.caixaSelecao, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
                        onPress={() => abrirModalSelecao(`${dia.data}_saida_${pos}`, `Ordenação de Saída ${pos + 1} (${dia.rotulo})`, 'homens')}
                      >
                        <Text style={[styles.textoSelecao, !dadosEscala[`${dia.data}_saida_${pos}`] && styles.placeholder]}>
                          {dadosEscala[`${dia.data}_saida_${pos}`] || `Saída ${pos + 1} (Diácono)`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>

              {/* DOMINGOS */}
              <View style={styles.blocoCulto}>
                <Text style={styles.tituloSecao}>🟩 DOMINGOS ({diasCulto.domingos.length})</Text>
                {diasCulto.domingos.map(dia => (
                  <View key={dia.data} style={styles.cardDia}>
                    <Text style={styles.dataTitulo}>Domingo - {dia.rotulo}</Text>

                    <Text style={styles.labelFuncao}>Abrir Igreja (Diácono):</Text>
                    <TouchableOpacity
                      style={styles.caixaSelecao}
                      onPress={() => abrirModalSelecao(`${dia.data}_abrir`, `Abrir Igreja (${dia.rotulo})`, 'homens')}
                    >
                      <Text style={[styles.textoSelecao, !dadosEscala[`${dia.data}_abrir`] && styles.placeholder]}>
                        {dadosEscala[`${dia.data}_abrir`] || 'Selecionar diácono responsável'}
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.labelFuncao}>Recolhimento (2):</Text>
                    {[0, 1].map(pos => (
                      <TouchableOpacity
                        key={pos}
                        style={styles.caixaSelecao}
                        onPress={() => abrirModalSelecao(`${dia.data}_recolher_${pos}`, `Recolhimento ${pos + 1} (${dia.rotulo})`)}
                      >
                        <Text style={[styles.textoSelecao, !dadosEscala[`${dia.data}_recolher_${pos}`] && styles.placeholder]}>
                          {dadosEscala[`${dia.data}_recolher_${pos}`] || `Recolhimento ${pos + 1}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>

              {/* QUARTAS */}
              <View style={styles.blocoCulto}>
                <Text style={styles.tituloSecao}>🟨 QUARTAS-FEIRAS ({diasCulto.quartas.length})</Text>
                {diasCulto.quartas.map(dia => (
                  <View key={dia.data} style={styles.cardDia}>
                    <Text style={styles.dataTitulo}>Quarta-feira - {dia.rotulo}</Text>

                    <Text style={styles.labelFuncao}>Abrir Igreja (Diácono):</Text>
                    <TouchableOpacity
                      style={styles.caixaSelecao}
                      onPress={() => abrirModalSelecao(`${dia.data}_abrir`, `Abrir Igreja (${dia.rotulo})`, 'homens')}
                    >
                      <Text style={[styles.textoSelecao, !dadosEscala[`${dia.data}_abrir`] && styles.placeholder]}>
                        {dadosEscala[`${dia.data}_abrir`] || 'Selecionar diácono responsável'}
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.labelFuncao}>Recolhimento (2):</Text>
                    {[0, 1].map(pos => (
                      <TouchableOpacity
                        key={pos}
                        style={styles.caixaSelecao}
                        onPress={() => abrirModalSelecao(`${dia.data}_recolher_${pos}`, `Recolhimento ${pos + 1} (${dia.rotulo})`)}
                      >
                        <Text style={[styles.textoSelecao, !dadosEscala[`${dia.data}_recolher_${pos}`] && styles.placeholder]}>
                          {dadosEscala[`${dia.data}_recolher_${pos}`] || `Recolhimento ${pos + 1}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* ================= ABA LEMBRETES ================= */}
          {abaAtiva === 'lembretes' && (
            <ScrollView contentContainerStyle={styles.scrollPadrao}>
              {/* CARD DE ESCALA DIGITADA (TEXTO GERAL) */}
              <View style={styles.cardDigitadoDestaque}>
                <View style={styles.digitadoHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.digitadoTitulo}>📋 Escala Digitada Completa</Text>
                    <Text style={styles.digitadoSub}>Texto estruturado de todo o mês para o WhatsApp.</Text>
                  </View>
                </View>
                <View style={styles.linhaBotoesDigitado}>
                  <TouchableOpacity style={styles.btnCopiarGeral} onPress={copiarEscalaDigitada}>
                    <Text style={styles.btnCopiarGeralTexto}>Copiar Todo o Mês</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnVisualizarGeral} onPress={() => setModalDigitadoVisivel(true)}>
                    <Text style={styles.btnVisualizarGeralTexto}>Visualizar Texto</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.secaoTitulo}>Lembretes Semanais Individuais</Text>
              <Text style={styles.secaoDescricao}>Puxa os escalados da semana automaticamente.</Text>

              {templates.map(item => (
                <View key={item.id} style={styles.cardLembrete}>
                  <View style={styles.lembreteHeader}>
                    <Text style={styles.lembreteTitulo}>{item.titulo}</Text>
                    <TouchableOpacity style={styles.btnCopiar} onPress={() => copiarLembrete(item)}>
                      <Text style={styles.btnCopiarTexto}>Copiar</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.lembreteCorpo} numberOfLines={6}>{item.corpo}</Text>
                </View>
              ))}
            </ScrollView>
          )}
{/* ================= ABA EQUIPE ================= */}
          {abaAtiva === 'equipe' && (
            <View style={{ flex: 1 }}>
              {/* Barra de botões fixa no topo */}
              <View style={styles.topoFixoBotoes}>
                <TouchableOpacity style={styles.btnAcao} onPress={() => setModalIndividualVisivel(true)}>
                  <Text style={styles.btnAcaoTexto}>+ Adicionar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnAcao, { backgroundColor: '#334155' }]} onPress={() => setModalLoteVisivel(true)}>
                  <Text style={styles.btnAcaoTexto}>📋 Em Lote</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={membros}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.scrollListaMembros}
                showsVerticalScrollIndicator={true}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.cardMembro}
                    onLongPress={() => {
                      Alert.alert(item.nome, 'Opções:', [
                        {
                          text: 'Editar',
                          onPress: () => {
                            setMembroEditandoId(item.id);
                            setEditaNome(item.nome);
                            setEditaCargo(item.cargo || 'Diácono');
                            setEditaTelefone(item.telefone || '');
                            setModalEdicaoVisivel(true);
                          }
                        },
                        {
                          text: item.ativo ? 'Desativar' : 'Ativar',
                          onPress: async () => {
                            await supabase.from('membros').update({ ativo: !item.ativo }).eq('id', item.id);
                            carregarDados();
                          }
                        },
                        {
                          text: 'Remover',
                          style: 'destructive',
                          onPress: async () => {
                            await supabase.from('membros').delete().eq('id', item.id);
                            carregarDados();
                          }
                        },
                        { text: 'Cancelar', style: 'cancel' }
                      ]);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.membroNome}>{item.nome}</Text>
                      <Text style={styles.membroCargo}>{item.cargo || item.tipo || 'Diácono'} • {item.telefone || 'Sem contacto'}</Text>
                    </View>
                    <View style={[styles.tagStatus, { backgroundColor: item.ativo ? '#dcfce7' : '#fee2e2' }]}>
                      <Text style={{ color: item.ativo ? '#166534' : '#991b1b', fontWeight: 'bold', fontSize: 12 }}>
                        {item.ativo ? 'Ativo' : 'Inativo'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      )}

      {/* MODAL VISUALIZAR ESCALA DIGITADA */}
      <Modal visible={modalDigitadoVisivel} transparent animationType="slide">
        <View style={styles.fundoModal}>
          <View style={[styles.conteudoModal, { maxHeight: '80%' }]}>
            <Text style={styles.tituloModal}>Escala Digitada ({MESES[mesSelecionado - 1]}/{anoSelecionado})</Text>
            
            <ScrollView 
              style={styles.caixaTextoScrollModal} 
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              <Text style={{ fontSize: 13, color: '#1e293b', lineHeight: 20 }}>
                {gerarTextoEscalaDigitada()}
              </Text>
            </ScrollView>

            <View style={styles.linhaBotoesModal}>
              <TouchableOpacity 
                style={styles.btnModalCancelar} 
                onPress={() => setModalDigitadoVisivel(false)}
              >
                <Text style={styles.btnModalCancelarTexto}>Fechar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.btnModalSalvar} 
                onPress={() => { copiarEscalaDigitada(); setModalDigitadoVisivel(false); }}
              >
                <Text style={styles.btnModalSalvarTexto}>Copiar Texto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SELETOR DE MÊS */}
      <Modal visible={modalMesVisivel} transparent animationType="fade">
        <View style={styles.fundoModal}>
          <View style={styles.conteudoModal}>
            <Text style={styles.tituloModal}>Selecione o Mês</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {MESES.map((m, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.itemMesLista, mesSelecionado === idx + 1 && styles.itemMesAtivo]}
                  onPress={() => {
                    setMesSelecionado(idx + 1);
                    setModalMesVisivel(false);
                  }}
                >
                  <Text style={[styles.textoMesLista, mesSelecionado === idx + 1 && styles.textoMesAtivo]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.btnModalCancelar} onPress={() => setModalMesVisivel(false)}>
              <Text style={styles.btnModalCancelarTexto}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL SELETOR HÍBRIDO DE NOMES */}
      <Modal visible={modalSeletorVisivel} transparent animationType="slide">
        <View style={styles.fundoModal}>
          <View style={styles.conteudoModal}>
            <Text style={styles.tituloModal}>{seletorTitulo}</Text>

            <Text style={styles.labelInput}>Digitar ou pesquisar oficial:</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite o nome..."
              value={seletorBusca}
              onChangeText={setSeletorBusca}
              autoFocus
            />

            <View style={styles.linhaBotoesModal}>
              <TouchableOpacity
                style={[styles.btnModalSalvar, { backgroundColor: '#16a34a', flex: 1 }]}
                onPress={() => confirmarSelecao(seletorBusca.trim().toUpperCase())}
              >
                <Text style={styles.btnModalSalvarTexto}>Usar Nome Digitado</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnModalSalvar, { backgroundColor: '#ef4444', paddingHorizontal: 12 }]}
                onPress={() => confirmarSelecao('')}
              >
                <Text style={styles.btnModalSalvarTexto}>Limpar</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.labelInput, { marginTop: 12 }]}>Oficiais Disponíveis:</Text>
            <ScrollView style={{ maxHeight: 200, marginTop: 4 }}>
              {obterListaMembrosFiltrada().map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.itemSugestao}
                  onPress={() => confirmarSelecao(m.nome)}
                >
                  <Text style={styles.sugestaoNome}>{m.nome}</Text>
                  <Text style={styles.sugestaoCargo}>{m.cargo || m.tipo}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.btnModalCancelar} onPress={() => setModalSeletorVisivel(false)}>
              <Text style={styles.btnModalCancelarTexto}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL NOVO INDIVIDUAL */}
      <Modal visible={modalIndividualVisivel} transparent animationType="slide">
        <View style={styles.fundoModal}>
          <View style={styles.conteudoModal}>
            <Text style={styles.tituloModal}>Novo Oficial</Text>

            <Text style={styles.labelInput}>Nome Completo</Text>
            <TextInput style={styles.input} placeholder="Ex: JOÃO SILVA" value={novoNome} onChangeText={setNovoNome} />

            <Text style={styles.labelInput}>Cargo</Text>
            <View style={styles.linhaCargo}>
              <TouchableOpacity
                style={[styles.btnCargo, novoCargo === 'Diácono' && styles.btnCargoAtivo]}
                onPress={() => setNovoCargo('Diácono')}
              >
                <Text style={[styles.textoCargo, novoCargo === 'Diácono' && styles.textoCargoAtivo]}>Diácono</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnCargo, novoCargo === 'Diaconisa' && styles.btnCargoAtivo]}
                onPress={() => setNovoCargo('Diaconisa')}
              >
                <Text style={[styles.textoCargo, novoCargo === 'Diaconisa' && styles.textoCargoAtivo]}>Diaconisa</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.labelInput}>Telefone (Opcional)</Text>
            <TextInput style={styles.input} placeholder="(81) 98888-7777" value={novoTelefone} onChangeText={setNovoTelefone} keyboardType="phone-pad" />

            <View style={styles.linhaBotoesModal}>
              <TouchableOpacity style={styles.btnModalCancelar} onPress={() => setModalIndividualVisivel(false)}>
                <Text style={styles.btnModalCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnModalSalvar} onPress={cadastrarIndividual}>
                <Text style={styles.btnModalSalvarTexto}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL LOTE */}
      <Modal visible={modalLoteVisivel} transparent animationType="slide">
        <View style={styles.fundoModal}>
          <View style={styles.conteudoModal}>
            <Text style={styles.tituloModal}>Registo em Lote</Text>

            <Text style={styles.labelInput}>Cargo do Grupo:</Text>
            <View style={styles.linhaCargo}>
              <TouchableOpacity
                style={[styles.btnCargo, cargoLote === 'Diácono' && styles.btnCargoAtivo]}
                onPress={() => setCargoLote('Diácono')}
              >
                <Text style={[styles.textoCargo, cargoLote === 'Diácono' && styles.textoCargoAtivo]}>Diáconos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnCargo, cargoLote === 'Diaconisa' && styles.btnCargoAtivo]}
                onPress={() => setCargoLote('Diaconisa')}
              >
                <Text style={[styles.textoCargo, cargoLote === 'Diaconisa' && styles.textoCargoAtivo]}>Diaconisas</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.labelInput}>Cole os nomes abaixo (um por linha):</Text>
            <TextInput
              style={styles.inputArea}
              placeholder="PAULO CÉSAR&#10;GABRIEL LIMA&#10;MARCOS VINICIUS"
              multiline
              numberOfLines={6}
              value={textoLote}
              onChangeText={setTextoLote}
            />

            <View style={styles.linhaBotoesModal}>
              <TouchableOpacity style={styles.btnModalCancelar} onPress={() => setModalLoteVisivel(false)}>
                <Text style={styles.btnModalCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnModalSalvar} onPress={cadastrarLote}>
                <Text style={styles.btnModalSalvarTexto}>Processar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL EDIÇÃO */}
      <Modal visible={modalEdicaoVisivel} transparent animationType="slide">
        <View style={styles.fundoModal}>
          <View style={styles.conteudoModal}>
            <Text style={styles.tituloModal}>Editar Membro</Text>
            <Text style={styles.labelInput}>Nome Completo</Text>
            <TextInput style={styles.input} value={editaNome} onChangeText={setEditaNome} />

            <Text style={styles.labelInput}>Cargo</Text>
            <View style={styles.linhaCargo}>
              <TouchableOpacity
                style={[styles.btnCargo, editaCargo === 'Diácono' && styles.btnCargoAtivo]}
                onPress={() => setEditaCargo('Diácono')}
              >
                <Text style={[styles.textoCargo, editaCargo === 'Diácono' && styles.textoCargoAtivo]}>Diácono</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnCargo, editaCargo === 'Diaconisa' && styles.btnCargoAtivo]}
                onPress={() => setEditaCargo('Diaconisa')}
              >
                <Text style={[styles.textoCargo, editaCargo === 'Diaconisa' && styles.textoCargoAtivo]}>Diaconisa</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.labelInput}>Telefone</Text>
            <TextInput style={styles.input} value={editaTelefone} onChangeText={setEditaTelefone} keyboardType="phone-pad" />

            <View style={styles.linhaBotoesModal}>
              <TouchableOpacity style={styles.btnModalCancelar} onPress={() => setModalEdicaoVisivel(false)}>
                <Text style={styles.btnModalCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnModalSalvar} onPress={salvarEdicao}>
                <Text style={styles.btnModalSalvarTexto}>Atualizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0b4f7b' },
  header: { backgroundColor: '#0b4f7b', paddingVertical: 14, alignItems: 'center' },
  headerTitulo: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#bae6fd', fontSize: 11, marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabItemAtivo: { borderBottomColor: '#0b4f7b' },
  tabTexto: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextoAtivo: { color: '#0b4f7b', fontWeight: 'bold' },
  conteudo: { flex: 1, backgroundColor: '#f8fafc' },
  centralizado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoCarregando: { marginTop: 8, color: '#64748b' },
  scrollPadrao: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 100 },
  cardFiltro: { backgroundColor: '#ffffff', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 14 },
  secaoTitulo: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  secaoDescricao: { fontSize: 12, color: '#64748b', marginBottom: 14, marginTop: 2 },
  linhaFiltros: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  labelFiltro: { fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 4 },
  campoSelecaoMes: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, paddingHorizontal: 12, height: 46, justifyContent: 'center', backgroundColor: '#f8fafc' },
  textoSelecaoMes: { fontSize: 14, fontWeight: 'bold', color: '#0b4f7b' },
  inputAno: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, paddingHorizontal: 10, height: 46, fontSize: 15, backgroundColor: '#f8fafc' },
  linhaBotoesAcao: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnSalvar: { flex: 1, backgroundColor: '#16a34a', paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  btnPdf: { flex: 1, backgroundColor: '#0b4f7b', paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  btnTextoBranco: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  blocoCulto: { marginBottom: 14 },
  tituloSecao: { fontSize: 14, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 8 },
  cardDia: { backgroundColor: '#ffffff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  dataTitulo: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 4 },
  labelFuncao: { fontSize: 11, fontWeight: 'bold', color: '#475569', marginTop: 6, marginBottom: 2 },
  caixaSelecao: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#f8fafc', marginBottom: 5 },
  textoSelecao: { fontSize: 13, color: '#1e293b', fontWeight: '600' },
  placeholder: { color: '#94a3b8', fontWeight: 'normal' },
  cardDigitadoDestaque: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 8, padding: 14, marginBottom: 16 },
  digitadoHeader: { marginBottom: 10 },
  digitadoTitulo: { fontSize: 15, fontWeight: 'bold', color: '#1e40af' },
  digitadoSub: { fontSize: 12, color: '#3b82f6', marginTop: 2 },
  linhaBotoesDigitado: { flexDirection: 'row', gap: 10 },
  btnCopiarGeral: { flex: 1, backgroundColor: '#1d4ed8', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  btnCopiarGeralTexto: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  btnVisualizarGeral: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#1d4ed8', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  btnVisualizarGeralTexto: { color: '#1d4ed8', fontWeight: 'bold', fontSize: 12 },
  cardLembrete: { backgroundColor: '#ffffff', padding: 14, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  lembreteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lembreteTitulo: { fontSize: 14, fontWeight: 'bold', color: '#0b4f7b', flex: 1 },
  btnCopiar: { backgroundColor: '#0b4f7b', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  btnCopiarTexto: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  lembreteCorpo: { color: '#475569', fontSize: 12, lineHeight: 17 },
  topoFixoBotoes: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, gap: 10, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, zIndex: 10 },
  scrollListaMembros: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 110 },
  barraBotoes: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 14, gap: 10 },
  btnAcao: { flex: 1, backgroundColor: '#0b4f7b', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnAcaoTexto: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  cardMembro: { backgroundColor: '#ffffff', padding: 12, borderRadius: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  membroNome: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  membroCargo: { fontSize: 12, color: '#64748b', marginTop: 2 },
  tagStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  fundoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  conteudoModal: { backgroundColor: '#ffffff', borderRadius: 10, padding: 18 },
  tituloModal: { fontSize: 16, fontWeight: 'bold', color: '#0b4f7b', marginBottom: 8 },
  labelInput: { fontSize: 12, fontWeight: '600', color: '#334155', marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  inputArea: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 10, fontSize: 13, height: 110, textAlignVertical: 'top' },
  linhaCargo: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  btnCargo: { flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', backgroundColor: '#f8fafc' },
  btnCargoAtivo: { backgroundColor: '#0b4f7b', borderColor: '#0b4f7b' },
  textoCargo: { fontSize: 12, fontWeight: '600', color: '#475569' },
  textoCargoAtivo: { color: '#ffffff', fontWeight: 'bold' },
  linhaBotoesModal: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 14 },
  btnModalCancelar: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  btnModalCancelarTexto: { color: '#475569', fontWeight: 'bold', fontSize: 12 },
  btnModalSalvar: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, backgroundColor: '#0b4f7b', alignItems: 'center', justifyContent: 'center' },
  btnModalSalvarTexto: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  caixaTextoScrollModal: { maxHeight: 380, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 10, backgroundColor: '#ffffff', marginVertical: 10 },
  itemSugestao: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between' },
  sugestaoNome: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  sugestaoCargo: { fontSize: 11, color: '#64748b' },
  itemMesLista: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemMesAtivo: { backgroundColor: '#e0f2fe', borderRadius: 6 },
  textoMesLista: { fontSize: 14, color: '#334155' },
  textoMesAtivo: { color: '#0b4f7b', fontWeight: 'bold' }
});