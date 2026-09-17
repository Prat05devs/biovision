import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BriefcaseMedical,
  Building2,
  Camera,
  Check,
  ChevronRight,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleCheckBig,
  CircleDot,
  Clock3,
  Cross,
  ExternalLink,
  Eye,
  FileText,
  FlaskConical,
  Hand,
  Heart,
  HeartPulse,
  Info,
  Image as ImageIcon,
  Languages,
  List,
  LoaderCircle,
  Map,
  MapPin,
  MapPinCheck,
  MessageCircleMore,
  MessagesSquare,
  Navigation,
  Phone,
  RefreshCw,
  ScanFace,
  Settings,
  Share2,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Sun,
  TriangleAlert,
  Brain,
  Droplet,
  Gauge,
  Leaf,
  Moon,
  Sparkles,
  Wind,
  X,
  type IconNode,
} from 'lucide';
import { MorphIcon, type SpringPreset } from 'morphicons/react-native';

const icons = {
  activity: Activity,
  alertCircle: CircleAlert,
  alertTriangle: TriangleAlert,
  arrowBack: ArrowLeft,
  arrowForward: ArrowRight,
  building: Building2,
  camera: Camera,
  check: Check,
  checkCircle: CircleCheckBig,
  checkCircleOutline: CircleCheck,
  chevronForward: ChevronRight,
  circle: Circle,
  circleDot: CircleDot,
  clock: Clock3,
  cross: Cross,
  externalLink: ExternalLink,
  eye: Eye,
  fileText: FileText,
  flask: FlaskConical,
  hand: Hand,
  heart: Heart,
  heartPulse: HeartPulse,
  info: Info,
  image: ImageIcon,
  language: Languages,
  list: List,
  loader: LoaderCircle,
  map: Map,
  mapPin: MapPin,
  mapPinCheck: MapPinCheck,
  medicalBag: BriefcaseMedical,
  message: MessageCircleMore,
  messages: MessagesSquare,
  navigation: Navigation,
  phone: Phone,
  refresh: RefreshCw,
  scan: ScanFace,
  settings: Settings,
  share: Share2,
  shieldCheck: ShieldCheck,
  smartphone: Smartphone,
  stethoscope: Stethoscope,
  sun: Sun,
  brain: Brain,
  close: X,
  droplet: Droplet,
  gauge: Gauge,
  leaf: Leaf,
  moon: Moon,
  sparkles: Sparkles,
  wind: Wind,
} as const satisfies Record<string, IconNode>;

export type AppIconName = keyof typeof icons;

export function AppIcon({
  name,
  size = 22,
  color,
  strokeWidth = 2,
  label,
  spring = 'snappy',
}: {
  name: AppIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  label?: string;
  spring?: SpringPreset;
}) {
  return (
    <MorphIcon
      icon={icons[name]}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      label={label}
      spring={spring}
      reducedMotion="user"
    />
  );
}
