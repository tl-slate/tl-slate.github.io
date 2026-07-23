// public/data/talents.json 은 tlidb.com/ko 의 SS13 재능 페이지(신별 6개 + 명왕)에서
// 브라우저 DOM 파싱으로 추출한 한글 실데이터입니다.
//
// 재추출 방법(권장): 브라우저에서 tlidb.com/ko 를 연 뒤 콘솔에서 아래 로직을 실행하면
// text-mod span 기준으로 정확히 파싱됩니다. Node 에는 DOM 이 없어 브라우저 추출을 권장합니다.
//
//   const PAGES = [
//     ['Might','힘의 신','God_of_Might'], ['War','전쟁의 신','God_of_War'],
//     ['Hunting','사냥의 여신','Goddess_of_Hunting'], ['Knowledge','지식의 여신','Goddess_of_Knowledge'],
//     ['Machines','기계의 신','God_of_Machines'], ['Deception','기만의 여신','Goddess_of_Deception'],
//     ['Nether King','명왕','Nether_Kings_Divinity'],
//   ]
//   // 각 페이지를 fetch -> DOMParser -> [data-talent-id] 타일 순회:
//   //   name = 타일 텍스트, tier = (name==='하위 재능'||'하위 명왕 재능 포인트') ? '하위 재능' : '핵심 재능'
//   //   effect = 타일 효과 텍스트, stats = text-mod 값 + 앞선 서술어 + 뒤따르는 '%' 단위
//   // 결과를 { source, gods, labels, summary, talents, glossary } 로 저장.
//
// 스키마:
//   talents[god] = [{ id, god, tier:'핵심 재능'|'하위 재능', name, effect, stats:[{descriptor,value,unit}] }]
//
// 이 스크립트는 실수로 실데이터를 덮어쓰지 않도록 의도적으로 아무것도 쓰지 않습니다.
console.log('public/data/talents.json 는 tlidb.com/ko 추출 한글 데이터입니다. 재추출은 위 주석의 브라우저 절차를 참고하세요.')
